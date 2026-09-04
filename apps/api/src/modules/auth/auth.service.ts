import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import type {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './auth.validation';
import { NotificationsService } from '../notifications/notifications.service';
import { MailerService } from '../notifications/mailer.service';
import { AuditService } from '../audit/audit.service';

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  createdAt: Date;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly mailerService: MailerService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('E-mail já está em uso');
    }

    if (dto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existingPhone) {
        throw new ConflictException('Telefone já está em uso');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        phone: dto.phone || null,
        role: 'CUSTOMER',
        status: 'ACTIVE',
      },
    });

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.storeRefreshToken(user.id, tokens.refreshToken);

    await this.audit.record({
      userId: user.id,
      action: 'USER_CREATED',
      entity: 'User',
      entityId: user.id,
      metadata: { email: user.email, name: user.name, role: user.role },
    });

    this.notificationsService.notify(user.id, 'ACCOUNT_CREATED', {
      userName: user.name,
    });

    this.logger.log(`User registered: ${user.email}`);

    return {
      user: this.toUserResponse(user),
      tokens,
    };
  }

  async login(dto: LoginDto): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Conta desativada ou bloqueada');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.storeRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`User logged in: ${user.email}`);

    return {
      user: this.toUserResponse(user),
      tokens,
    };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = this.jwtService.verify<TokenPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Token inválido');
      }

      const storedToken = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM refresh_tokens
        WHERE user_id = ${user.id}::uuid
        AND token_hash = ${this.hashToken(refreshToken)}
        AND expires_at > NOW()
        LIMIT 1
      `;

      if (!storedToken || storedToken.length === 0) {
        throw new UnauthorizedException('Refresh token inválido ou expirado');
      }

      const tokens = await this.generateTokens({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      await this.storeRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.$executeRaw`
      DELETE FROM refresh_tokens WHERE user_id = ${userId}::uuid
    `;
    this.logger.log(`User logged out: ${userId}`);
  }

  async getMe(userId: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return this.toUserResponse(user);
  }

  /**
   * Solicita redefinição de senha. Gera um token de uso único, armazena seu
   * hash e envia um e-mail com o link. Retorna sucesso mesmo quando o e-mail
   * não existe para não vazar quais contas estão cadastradas.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || user.status !== 'ACTIVE') {
      this.logger.log(`Forgot password: conta não encontrada/inativa ${dto.email}`);
      return { message: 'Se o e-mail estiver cadastrado, você receberá o link de redefinição.' };
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.prisma.$executeRaw`
      INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at)
      VALUES (gen_random_uuid(), ${user.id}::uuid, ${tokenHash}, ${expiresAt}, NOW())
    `;

    const siteUrl = this.configService.get<string>('SITE_URL') ?? 'http://localhost:3000';
    const resetUrl = `${siteUrl}/redefinir-senha?token=${token}`;

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Redefinição de senha — E-Horta',
      html: this.buildResetPasswordEmailHtml(user.name, resetUrl, 1),
    });

    this.logger.log(`Password reset link enviado para ${user.email}`);

    return { message: 'Se o e-mail estiver cadastrado, você receberá o link de redefinição.' };
  }

  /**
   * Redefine a senha usando um token de redefinição previamente enviado.
   * O token é de uso único, expira em 1h e invalida todos os refresh tokens
   * (força novo login com a nova senha).
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = this.hashToken(dto.token);

    const tokenRecord = await this.prisma.$queryRaw<
      Array<{ id: string; user_id: string }>
    >`
      SELECT id, user_id FROM password_reset_tokens
      WHERE token_hash = ${tokenHash}
      AND used_at IS NULL
      AND expires_at > NOW()
      LIMIT 1
    `;

    if (!tokenRecord || tokenRecord.length === 0) {
      throw new BadRequestException('Token inválido ou expirado');
    }

    const record = tokenRecord[0];
    const passwordHash = await bcrypt.hash(dto.password, 12);

    await this.prisma.$transaction([
      this.prisma.$executeRaw`
        UPDATE users SET password_hash = ${passwordHash}, updated_at = NOW()
        WHERE id = ${record.user_id}::uuid
      `,
      this.prisma.$executeRaw`
        UPDATE password_reset_tokens SET used_at = NOW()
        WHERE id = ${record.id}::uuid
      `,
      this.prisma.$executeRaw`
        DELETE FROM refresh_tokens WHERE user_id = ${record.user_id}::uuid
      `,
    ]);

    this.logger.log(`Senha redefinida via token para user ${record.user_id}`);

    return { message: 'Senha redefinida com sucesso. Faça login com a nova senha.' };
  }

  /**
   * Altera a senha do usuário autenticado. Exige a senha atual, gera a nova
   * hash e invalida todos os refresh tokens (força novo login).
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Senha atual incorreta');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.$executeRaw`
        UPDATE users SET password_hash = ${passwordHash}, updated_at = NOW()
        WHERE id = ${userId}::uuid
      `,
      this.prisma.$executeRaw`
        DELETE FROM refresh_tokens WHERE user_id = ${userId}::uuid
      `,
    ]);

    this.audit.record({
      userId,
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: userId,
      metadata: {},
    });

    this.logger.log(`Senha alterada para user ${userId}`);

    return { message: 'Senha alterada com sucesso. Faça login novamente.' };
  }

  private buildResetPasswordEmailHtml(userName: string, resetUrl: string, expiresHours: number): string {
    const firstName = userName.split(' ')[0];
    return `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#3a3a3a">
        <div style="background:#f97316;border-radius:12px 12px 0 0;padding:20px 24px">
          <span style="color:#fff;font-size:20px;font-weight:700">🥬 E-Horta</span>
        </div>
        <div style="background:#ffffff;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;padding:28px 24px">
          <h2 style="margin:0 0 12px;font-size:18px">Olá, ${firstName}!</h2>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6">Recebemos uma solicitação para redefinir a sua senha. Clique no botão abaixo para criar uma nova senha:</p>
          <a href="${resetUrl}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:999px">Redefinir senha</a>
          <p style="margin:20px 0 0;font-size:13px;color:#888;line-height:1.6">Ou copie e cole este link no navegador:<br/><a href="${resetUrl}" style="color:#f97316;word-break:break-all">${resetUrl}</a></p>
          <p style="margin:16px 0 0;font-size:12px;color:#bbb">Este link expira em ${expiresHours} hora(s).</p>
          <p style="margin:8px 0 0;font-size:12px;color:#bbb">Se você não solicitou esta redefinição, ignore este e-mail. Sua senha não será alterada.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0 16px"/>
          <p style="margin:0;font-size:12px;color:#999">E-Horta — Fresquinho na sua porta</p>
        </div>
      </div>
    `;
  }

  private async generateTokens(payload: TokenPayload): Promise<AuthTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.$executeRaw`
      INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
      VALUES (gen_random_uuid(), ${userId}::uuid, ${tokenHash}, ${expiresAt}, NOW())
      ON CONFLICT (user_id) DO UPDATE
      SET token_hash = ${tokenHash}, expires_at = ${expiresAt}, created_at = NOW()
    `;
  }

  /**
   * Hash determinístico (SHA-256) para permitir busca por igualdade no banco.
   * bcrypt NÃO serve aqui: o salt aleatório faria o mesmo token gerar hashes
   * diferentes a cada chamada, impossibilitando a comparação.
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private toUserResponse(user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    status: string;
    createdAt: Date;
  }): UserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}
