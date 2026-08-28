import { Controller, Get, Patch, Param, Body, Query, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser, AuditContext } from '../../common/decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { adminUsersQuerySchema, updateUserStatusSchema } from '../users/users.validation';
import type { AdminUsersQueryDto, UpdateUserStatusDto } from '../users/users.validation';
import type { AuditContext as AuditContextType } from '../audit/audit.service';

@ApiTags('Admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Listar clientes e operadores' })
  async findAll(@Query(new ZodValidationPipe(adminUsersQuerySchema)) query: AdminUsersQueryDto) {
    const result = await this.usersService.findAllForAdmin(query);
    return { data: result.users, meta: result.meta, error: null };
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Ativar/inativar/bloquear usuário' })
  async updateStatus(
    @CurrentUser() admin: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @AuditContext() ctx: AuditContextType,
    @Body(new ZodValidationPipe(updateUserStatusSchema)) body: UpdateUserStatusDto,
  ) {
    const result = await this.usersService.updateStatusForAdmin(admin.id, id, body.status, ctx);
    return { data: result, meta: {}, error: null };
  }
}