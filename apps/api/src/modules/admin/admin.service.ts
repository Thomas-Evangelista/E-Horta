import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface AdminDashboard {
  ordersToday: number;
  salesToday: number;
  pendingOrders: number;
  lowStockProducts: number;
  activeProducts: number;
  customers: number;
}

export interface TrendPoint {
  date: string;
  orders: number;
  revenue: number;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  customer: string;
  total: number;
  status: string;
  createdAt: Date;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Indicadores do painel (specs/17-admin.md):
   * - Pedidos hoje: pedidos criados desde o início do dia;
   * - Vendas hoje: soma dos pagamentos aprovados no dia;
   * - Pedidos pendentes: aguardando pagamento;
   * - Produtos com estoque baixo: disponível <= mínimo configurado.
   */
  async getDashboard(): Promise<AdminDashboard> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [ordersToday, salesToday, pendingOrders, inventories, activeProducts, customers] =
      await Promise.all([
        this.prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
        this.prisma.payment.aggregate({
          _sum: { amount: true },
          where: { status: 'APPROVED', paidAt: { gte: startOfToday } },
        }),
        this.prisma.order.count({ where: { status: 'PENDING_PAYMENT' } }),
        this.prisma.inventory.findMany({
          select: { quantity: true, reservedQuantity: true, minimumStock: true },
        }),
        this.prisma.product.count({ where: { isActive: true } }),
        this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      ]);

    return {
      ordersToday,
      salesToday: salesToday._sum.amount?.toNumber() ?? 0,
      pendingOrders,
      lowStockProducts: inventories.filter(
        (inventory) => inventory.quantity - inventory.reservedQuantity <= inventory.minimumStock,
      ).length,
      activeProducts,
      customers,
    };
  }

  /**
   * Tendência diária de pedidos e receita para o gráfico do painel.
   * Considera apenas pedidos pagos (pagamentos aprovados) para a receita;
   * conta pedidos criados por dia como volume.
   */
  async getTrends(days: number): Promise<TrendPoint[]> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true, total: true, paymentStatus: true },
    });

    const buckets = new Map<string, { orders: number; revenue: number }>();
    const cursor = new Date(start);
    for (let i = 0; i < days; i++) {
      const key = cursor.toISOString().slice(0, 10);
      buckets.set(key, { orders: 0, revenue: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    for (const order of orders) {
      const key = order.createdAt.toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.orders += 1;
      if (order.paymentStatus === 'APPROVED') {
        bucket.revenue += order.total.toNumber();
      }
    }

    return Array.from(buckets.entries()).map(([date, value]) => ({
      date,
      orders: value.orders,
      revenue: Math.round(value.revenue * 100) / 100,
    }));
  }

  /** Pedidos recentes, ordenados por criação, para tabela resumida do painel. */
  async getRecentOrders(limit = 8): Promise<RecentOrder[]> {
    const orders = await this.prisma.order.findMany({
      select: {
        id: true,
        orderNumber: true,
        total: true,
        status: true,
        createdAt: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customer: order.user.name,
      total: order.total.toNumber(),
      status: order.status,
      createdAt: order.createdAt,
    }));
  }
}
