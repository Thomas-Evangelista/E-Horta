import { Controller, Get, Post, Param, Body, Query, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ordersQuerySchema, cancelOrderSchema } from './orders.validation';
import type { OrdersQueryDto, CancelOrderDto } from './orders.validation';
import type { RepeatOrderResult } from './orders.service';

@ApiTags('Orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pedidos do usuário autenticado' })
  async findAll(
    @CurrentUser() user: { id: string },
    @Query(new ZodValidationPipe(ordersQuerySchema)) query: OrdersQueryDto,
  ) {
    const result = await this.ordersService.findAllByUser(user.id, query.page, query.limit);
    return {
      data: result.orders,
      meta: result.meta,
      error: null,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um pedido do usuário autenticado' })
  async findById(@CurrentUser() user: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.ordersService.findByIdForUser(user.id, id);
    return { data: result, meta: {}, error: null };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar pedido ainda não pago' })
  async cancel(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(cancelOrderSchema)) dto: CancelOrderDto,
  ) {
    const result = await this.ordersService.cancelForUser(user.id, id, dto);
    return { data: result, meta: {}, error: null };
  }

  @Post(':id/repeat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Repetir pedido: reimporta itens no carrinho atual' })
  async repeat(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: RepeatOrderResult; meta: Record<string, never>; error: null }> {
    const result = await this.ordersService.repeatOrderForUser(user.id, id);
    return { data: result, meta: {}, error: null };
  }
}
