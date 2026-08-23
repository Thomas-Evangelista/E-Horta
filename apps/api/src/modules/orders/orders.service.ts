import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, type OrderStatus, type PaymentStatus, type ShippingStatus } from '@prisma/client';
import { InventoryService } from '../inventory/inventory.service';
import { CartService, type CartResponse } from '../cart/cart.service';
import { isCustomerCancellable } from '../../common/utils/order-transitions';
import type { CancelOrderDto } from './orders.validation';

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: number;
  itemCount: number;
  cancellable: boolean;
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
  cancelledAt: Date | null;
  cancellationReason: string | null;
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
  cancellable: boolean;
}

export interface RepeatOrderAddedItem {
  productId: string;
  name: string;
  quantity: number;
}

export interface RepeatOrderSkippedItem {
  productId: string;
  name: string;
  reason: 'PRODUCT_UNAVAILABLE' | 'INSUFFICIENT_STOCK';
  availableStock?: number;
}

export interface RepeatOrderResult {
  addedItems: RepeatOrderAddedItem[];
  skippedItems: RepeatOrderSkippedItem[];
  cart: CartResponse;
}

interface LockedOrderRow {
  id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly cartService: CartService,
  ) {}

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
        cancellable: isCustomerCancellable(order.status),
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
      cancelledAt: order.cancelledAt,
      cancellationReason: order.cancellationReason,
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
      cancellable: isCustomerCancellable(order.status),
    };
  }

  /**
   * Cancelamento pelo cliente: permitido apenas enquanto o pedido aguarda
   * pagamento. Libera as reservas de estoque e invalida cobranças pendentes
   * dentro da mesma transação, com lock pessimista para impedir corrida
   * contra a aprovação do webhook do gateway.
   */
  async cancelForUser(userId: string, orderId: string, dto: CancelOrderDto): Promise<OrderDetail> {
    await this.prisma.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<LockedOrderRow[]>`
          SELECT "id", "status", "payment_status"
          FROM "orders"
          WHERE "id" = ${orderId}::uuid AND "user_id" = ${userId}::uuid
          FOR UPDATE
        `;

        const order = rows[0];

        if (!order) {
          throw new NotFoundException('Pedido não encontrado');
        }

        if (order.status === 'CANCELLED') {
          throw new ConflictException({
            code: 'ORDER_ALREADY_CANCELLED',
            message: 'Pedido já está cancelado',
          });
        }

        if (!isCustomerCancellable(order.status)) {
          throw new ConflictException({
            code: 'ORDER_NOT_CANCELLABLE',
            message:
              'Pedido não pode mais ser cancelado neste status. Entre em contato com o suporte.',
          });
        }

        if (order.payment_status === 'PENDING') {
          const items = await tx.orderItem.findMany({
            where: { orderId: order.id },
            select: {
              productId: true,
              productNameSnapshot: true,
              skuSnapshot: true,
              quantity: true,
            },
          });

          await this.inventoryService.releaseReservations(
            tx,
            items.map((item) => ({
              productId: item.productId,
              name: item.productNameSnapshot,
              sku: item.skuSnapshot,
              quantity: item.quantity,
            })),
          );

          await tx.payment.updateMany({
            where: { orderId: order.id, status: 'PENDING' },
            data: { status: 'CANCELLED' },
          });
        }

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancellationReason: dto.reason ?? null,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );

    this.logger.log(`Order ${orderId} cancelled by user ${userId}`);
    return this.findByIdForUser(userId, orderId);
  }

  /**
   * Repetir pedido: reimporta os itens do pedido original para o carrinho
   * ativo do usuário usando os dados atuais do catálogo (preço e estoque
   * atuais). Produtos indisponíveis ou sem saldo são pulados e reportados.
   */
  async repeatOrderForUser(userId: string, orderId: string): Promise<RepeatOrderResult> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: { orderBy: { id: 'asc' } } },
    });

    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    const cart = await this.cartService.resolveActiveCart({ kind: 'user', userId });

    const addedItems: RepeatOrderAddedItem[] = [];
    const skippedItems: RepeatOrderSkippedItem[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { inventory: true },
        });

        if (!product || !product.isActive) {
          skippedItems.push({
            productId: item.productId,
            name: item.productNameSnapshot,
            reason: 'PRODUCT_UNAVAILABLE',
          });
          continue;
        }

        const available = this.getAvailableStock(product.inventory);
        const existingItem = await tx.cartItem.findFirst({
          where: { cartId: cart.id, productId: product.id },
        });
        const inCart = existingItem?.quantity ?? 0;
        const roomForMore = Math.max(0, available - inCart);

        if (roomForMore <= 0) {
          skippedItems.push({
            productId: product.id,
            name: product.name,
            reason: 'INSUFFICIENT_STOCK',
            availableStock: available,
          });
          continue;
        }

        const quantityToAdd = Math.min(item.quantity, roomForMore);

        if (existingItem) {
          await tx.cartItem.update({
            where: { id: existingItem.id },
            data: { quantity: inCart + quantityToAdd, unitPrice: product.price },
          });
        } else {
          await tx.cartItem.create({
            data: {
              cartId: cart.id,
              productId: product.id,
              quantity: quantityToAdd,
              unitPrice: product.price,
            },
          });
        }

        addedItems.push({ productId: product.id, name: product.name, quantity: quantityToAdd });
      }
    });

    if (addedItems.length === 0) {
      throw new ConflictException({
        code: 'REPEAT_ORDER_NO_ITEMS',
        message: 'Nenhum item do pedido pôde ser adicionado ao carrinho',
        details: skippedItems.map((item) => ({
          field: 'items',
          message:
            item.reason === 'PRODUCT_UNAVAILABLE'
              ? `${item.name} indisponível`
              : `${item.name} sem estoque disponível`,
        })),
      });
    }

    this.logger.log(
      `Order ${orderId} repeated by user ${userId}: ${addedItems.length} added, ${skippedItems.length} skipped`,
    );

    return {
      addedItems,
      skippedItems,
      cart: await this.cartService.getCart({ kind: 'user', userId }),
    };
  }

  private getAvailableStock(inventory: { quantity: number; reservedQuantity: number } | null): number {
    if (!inventory) {
      return 0;
    }
    return Math.max(0, inventory.quantity - inventory.reservedQuantity);
  }
}
