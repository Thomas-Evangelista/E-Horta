import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InventoryService } from '../inventory/inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators';

@ApiTags('Admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
@Controller('admin/inventory')
export class AdminInventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Listar estoque de todos os produtos' })
  async findAll() {
    const result = await this.inventoryService.findAll();
    return { data: result, meta: {}, error: null };
  }

  @Get('low-stock')
  @ApiOperation({ summary: '[Admin] Produtos com estoque abaixo do mínimo' })
  async findLowStock() {
    const result = await this.inventoryService.findLowStock();
    return { data: result, meta: {}, error: null };
  }
}