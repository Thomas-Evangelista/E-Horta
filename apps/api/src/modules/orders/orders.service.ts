import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, type OrderStatus, type PaymentStatus, type ShippingStatus } from '@prisma/client';

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: number;
  itemCount: number;
  createdAt: Date;
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  shippingStatus: ShippingStatus;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  addressSnapshot: unknown;
  notes: string | null;
  createdAt: Date;
  items: Array<{
    productId: string;
    name: string;
    sku: string;
    unitPrice: number;
    quantity: number;
    total: number;
  }>;
  shipping: {
    method: string;
    status: ShippingStatus;
    trackingCode: string | null;
    estimatedDays: number | null;
  } | null;
  payment: {
    method: string;
    status: PaymentStatus;
    amount: number;
    paidAt: Date | null;
  } | null;
  paymentAttempts: number;
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUser(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ orders: OrderSummary[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safePage = Math.max(1, page);

    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where: { userId } }),
      this.prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          total: true,
          createdAt: true,
          items: { select: { quantity: true } },
        },
      }),
    ]);

    return {
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total.toNumber(),
        itemCount: order.items.reduce((acc, item) => acc + item.quantity, 0),
        createdAt: order.createdAt,
      })),
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      },
    };
  }

  async findByIdForUser(userId: string, orderId: string): Promise<OrderDetail> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: { orderBy: { id: 'asc' } },
        shipping: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { payments: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    const toNumber = (value: Prisma.Decimal) => value.toNumber();

    // Última tentativa de pagamento (a mais recente) é a relevante.
    const latestPayment = order.payments[0] ?? null;

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      shippingStatus: order.shippingStatus,
      subtotal: toNumber(order.subtotal),
      discount: toNumber(order.discount),
      shippingFee: toNumber(order.shippingFee),
      total: toNumber(order.total),
      addressSnapshot: order.addressSnapshot,
      notes: order.notes,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        productId: item.productId,
        name: item.productNameSnapshot,
        sku: item.skuSnapshot,
        unitPrice: toNumber(item.unitPrice),
        quantity: item.quantity,
        total: toNumber(item.total),
      })),
      shipping: order.shipping
        ? {
            method: order.shipping.method,
            status: order.shipping.status,
            trackingCode: order.shipping.trackingCode,
            estimatedDays: order.shipping.estimatedDays,
          }
        : null,
      payment: latestPayment
        ? {
            method: latestPayment.method,
            status: latestPayment.status,
            amount: toNumber(latestPayment.amount),
            paidAt: latestPayment.paidAt,
          }
        : null,
      paymentAttempts: order._count.payments,
    };
  }
}
