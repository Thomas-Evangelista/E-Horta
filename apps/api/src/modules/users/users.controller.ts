import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuditContext } from '../../common/decorators';
import type { AuditContext as AuditContextType } from '../audit/audit.service';

@ApiTags('Users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Obter perfil do usuário' })
  async getProfile(@CurrentUser() user: { id: string }) {
    const result = await this.usersService.getProfile(user.id);
    return { data: result, meta: {}, error: null };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualizar perfil do usuário' })
  async updateProfile(
    @CurrentUser() user: { id: string },
    @Body() body: { name?: string; phone?: string },
  ) {
    const result = await this.usersService.updateProfile(user.id, body);
    return { data: result, meta: {}, error: null };
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir conta (LGPD)' })
  async deleteAccount(
    @CurrentUser() user: { id: string },
    @AuditContext() ctx: AuditContextType,
  ) {
    await this.usersService.deleteAccount(user.id, ctx);
    return { data: { message: 'Conta excluída com sucesso' }, meta: {}, error: null };
  }
}
