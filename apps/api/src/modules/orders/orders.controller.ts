import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';

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
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.ordersService.findAllByUser(
      user.id,
      Number(page) || 1,
      Number(limit) || 20,
    );
    return {
      data: result.orders,
      meta: result.meta,
      error: null,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um pedido do usuário autenticado' })
  async findById(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    const result = await this.ordersService.findByIdForUser(user.id, id);
    return { data: result, meta: {}, error: null };
  }
}
