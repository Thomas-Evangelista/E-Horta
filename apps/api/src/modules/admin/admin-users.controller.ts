import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { adminUsersQuerySchema } from '../users/users.validation';
import type { AdminUsersQueryDto } from '../users/users.validation';

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
}