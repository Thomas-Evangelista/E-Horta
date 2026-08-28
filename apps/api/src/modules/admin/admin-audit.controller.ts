import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { auditQuerySchema } from '../audit/audit.validation';
import type { AuditQueryDto } from '../audit/audit.validation';

@ApiTags('Admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
@Controller('admin/audit')
export class AdminAuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({
    summary: '[Admin] Listar registros de auditoria (paginado, com filtro por ação)',
  })
  async findAll(@Query(new ZodValidationPipe(auditQuerySchema)) query: AuditQueryDto) {
    const result = await this.auditService.findAll(query);
    return { data: result.items, meta: result.meta, error: null };
  }
}
