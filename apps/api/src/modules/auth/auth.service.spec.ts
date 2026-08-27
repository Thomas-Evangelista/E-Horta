import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService, type AuthTokens } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hash-bcrypt'),
  compare: jest.fn(),
}));

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock };
    $queryRaw: jest.Mock;
    $executeRaw: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock; verify: jest.Mock };
  let configValues: Record<string, string | undefined>;
  let notificationsService: { notify: jest.Mock };

  const userRow = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'João da Silva',
    email: 'joao@example.com',
    passwordHash: 'hash-bcrypt',
    phone: null,
    role: 'CUSTOMER',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  const tokens: AuthTokens = {
    accessToken: 'access.jwt.token',
    refreshToken: 'refresh.jwt.token',
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue(userRow),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'rt-1' }]),
      $executeRaw: jest.fn().mockResolvedValue(undefined),
    };

    jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce(tokens.accessToken)
        .mockResolvedValue(tokens.refreshToken),
      verify: jest.fn(),
    };

    configValues = {
      JWT_REFRESH_SECRET: 'refresh-secret',
      JWT_ACCESS_SECRET: 'access-secret',
    };

    notificationsService = { notify: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => configValues[key],
          },
        },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    const dto = {
      name: 'João da Silva',
      email: 'joao@example.com',
      password: 'SenhaForte123!',
      confirmPassword: 'SenhaForte123!',
    };

    it('deve criar usuário, gerar tokens e notificar ACCOUNT_CREATED', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.register(dto);

      expect(result.user.email).toBe('joao@example.com');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'joao@example.com',
            role: 'CUSTOMER',
            status: 'ACTIVE',
            passwordHash: expect.not.stringMatching(/^SenhaForte123!$/),
          }),
        }),
      );
      expect(result.tokens).toEqual(tokens);
      expect(notificationsService.notify).toHaveBeenCalledWith(
        '11111111-1111-4111-8111-111111111111',
        'ACCOUNT_CREATED',
        expect.any(Object),
      );
    });

    it('deve lançar Conflict quando o e-mail já existe', async () => {
      prisma.user.findUnique.mockResolvedValue(userRow);

      await expect(service.register(dto)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('deve lançar Conflict quando o telefone já existe', async () => {
      prisma.user.findUnique.mockImplementation(async ({ where }) => {
        if ('email' in where && where.email) return null;
        if ('phone' in where && where.phone) return { ...userRow, phone: '11999999999' };
        return null;
      });

      await expect(
        service.register({ ...dto, phone: '11999999999' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    const dto = { email: 'joao@example.com', password: 'SenhaForte123!' };

    it('deve logar com credenciais válidas', async () => {
      prisma.user.findUnique.mockResolvedValue(userRow);
      mockBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.login(dto);

      expect(result.user.id).toBe(userRow.id);
      expect(result.tokens).toEqual(tokens);
    });

    it('deve lançar Unauthorized para usuário inexistente', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('deve lançar Unauthorized quando a senha está errada', async () => {
      prisma.user.findUnique.mockResolvedValue(userRow);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login(dto)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('deve lançar Unauthorized para conta desativada', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...userRow, status: 'INACTIVE' });

      await expect(service.login(dto)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('deve emitir novos tokens quando o refresh token é válido', async () => {
      jwtService.verify.mockReturnValue({
        sub: userRow.id,
        email: userRow.email,
        role: userRow.role,
      });
      prisma.user.findUnique.mockResolvedValue(userRow);
      prisma.$queryRaw.mockResolvedValue([{ id: 'rt-1' }]);

      const result = await service.refresh('refresh.jwt.token');

      expect(result).toEqual(tokens);
      expect(prisma.$executeRaw).toHaveBeenCalled();
    });

    it('deve lançar Unauthorized quando o refresh token não está armazenado', async () => {
      jwtService.verify.mockReturnValue({ sub: userRow.id });
      prisma.user.findUnique.mockResolvedValue(userRow);
      prisma.$queryRaw.mockResolvedValue([]);

      await expect(service.refresh('refresh.jwt.token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('deve lançar Unauthorized para token inválido/expirado', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('expired');
      });

      await expect(service.refresh('refresh.jwt.token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('deve lançar Unauthorized para usuário desativado', async () => {
      jwtService.verify.mockReturnValue({ sub: userRow.id });
      prisma.user.findUnique.mockResolvedValue({ ...userRow, status: 'INACTIVE' });

      await expect(service.refresh('refresh.jwt.token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('deve apagar os refresh tokens do usuário', async () => {
      await service.logout(userRow.id);

      expect(prisma.$executeRaw).toHaveBeenCalledWith(
        expect.anything(),
        userRow.id,
      );
      expect(String(prisma.$executeRaw.mock.calls[0][0])).toContain(
        'DELETE FROM refresh_tokens',
      );
    });
  });

  describe('getMe', () => {
    it('deve retornar o perfil do usuário', async () => {
      prisma.user.findUnique.mockResolvedValue(userRow);

      const result = await service.getMe(userRow.id);

      expect(result.email).toBe(userRow.email);
    });

    it('deve lançar NotFound quando o usuário não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe(userRow.id)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
