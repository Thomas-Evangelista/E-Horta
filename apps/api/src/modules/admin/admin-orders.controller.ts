import { Controller, Get, Param, Patch, Query, UseGuards, HttpCode, HttpStatus, Body, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersService } from '../orders/orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  adminOrdersQuerySchema,
  updateOrderStatusSchema,
} from '../orders/orders.validation';
import type {
  AdminOrdersQueryDto,
  UpdateOrderStatusDto,
} from '../orders/orders.validation';

@ApiTags('Admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Listar pedidos com filtros e busca' })
  async findAll(@Query(new ZodValidationPipe(adminOrdersQuerySchema)) query: AdminOrdersQueryDto) {
    const result = await this.ordersService.findAllForAdmin(query);
    return { data: result.orders, meta: result.meta, error: null };
  }

  @Get(':id')
  @ApiOperation({ summary: '[Admin] Detalhar pedido de qualquer cliente' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.ordersService.findByIdForAdmin(id);
    return { data: result, meta: {}, error: null };
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Atualizar status do pedido (máquina de estados)' })
  async updateStatus(
    @CurrentUser() admin: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateOrderStatusSchema)) body: UpdateOrderStatusDto,
  ) {
    const result = await this.ordersService.updateStatusForAdmin(admin.id, id, body);
    return { data: result, meta: {}, error: null };
  }
}