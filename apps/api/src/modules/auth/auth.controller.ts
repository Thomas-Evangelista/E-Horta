import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CartService } from '../cart/cart.service';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  type RegisterDto,
  type LoginDto,
  type ForgotPasswordDto,
  type ResetPasswordDto,
  type ChangePasswordDto,
} from './auth.validation';
import { CurrentUser, Public } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cartService: CartService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Criar conta de usuário' })
  async register(
    @Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto,
  ) {
    const result = await this.authService.register(dto);

    // Carrinho anônimo criado antes do cadastro é mesclado ao carrinho do usuário.
    const cart = dto.cartToken
      ? await this.cartService.mergeOnLogin(result.user.id, dto.cartToken)
      : null;

    return {
      data: cart ? { ...result, cart } : result,
      meta: {},
      error: null,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fazer login' })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
  ) {
    const result = await this.authService.login(dto);

    // Carrinho anônimo + carrinho do usuário → merge → carrinho final.
    const cart = dto.cartToken
      ? await this.cartService.mergeOnLogin(result.user.id, dto.cartToken)
      : null;

    return {
      data: cart ? { ...result, cart } : result,
      meta: {},
      error: null,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token' })
  async refresh(@Body() body: { refreshToken: string }) {
    const tokens = await this.authService.refresh(body.refreshToken);
    return {
      data: tokens,
      meta: {},
      error: null,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fazer logout' })
  async logout(@CurrentUser() user: { id: string }) {
    await this.authService.logout(user.id);
    return {
      data: { message: 'Logout realizado com sucesso' },
      meta: {},
      error: null,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter dados do usuário logado' })
  async me(@CurrentUser() user: { id: string }) {
    const result = await this.authService.getMe(user.id);
    return {
      data: result,
      meta: {},
      error: null,
    };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar redefinição de senha (envia e-mail)' })
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) dto: ForgotPasswordDto,
  ) {
    const result = await this.authService.forgotPassword(dto);
    return {
      data: result,
      meta: {},
      error: null,
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redefinir senha com token' })
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) dto: ResetPasswordDto,
  ) {
    const result = await this.authService.resetPassword(dto);
    return {
      data: result,
      meta: {},
      error: null,
    };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Alterar a própria senha (requer senha atual)' })
  async changePassword(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(changePasswordSchema)) dto: ChangePasswordDto,
  ) {
    const result = await this.authService.changePassword(user.id, dto);
    return {
      data: result,
      meta: {},
      error: null,
    };
  }
}
