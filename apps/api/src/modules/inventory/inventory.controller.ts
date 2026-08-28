import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, AuditContext } from '../../common/decorators';
import type { AuditContext as AuditContextType } from '../audit/audit.service';

@ApiTags('Inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Roles('ADMIN', 'OPERATOR')
  @Get()
  @ApiOperation({ summary: 'Listar estoque de todos os produtos' })
  async findAll() {
    const result = await this.inventoryService.findAll();
    return { data: result, meta: { total: result.length }, error: null };
  }

  @Roles('ADMIN', 'OPERATOR')
  @Get('low-stock')
  @ApiOperation({ summary: 'Produtos com estoque baixo' })
  async findLowStock() {
    const result = await this.inventoryService.findLowStock();
    return { data: result, meta: { total: result.length }, error: null };
  }

  @Roles('ADMIN')
  @Patch(':productId')
  @ApiOperation({ summary: 'Atualizar estoque de um produto (ADMIN)' })
  async updateStock(
    @Param('productId') productId: string,
    @AuditContext() ctx: AuditContextType,
    @Body() body: { quantity?: number; minimumStock?: number },
  ) {
    const result = await this.inventoryService.updateStock(productId, body, ctx);
    return { data: result, meta: {}, error: null };
  }
}
