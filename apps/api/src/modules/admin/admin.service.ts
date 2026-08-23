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
}
