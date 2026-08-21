import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, type OrderStatus, type PaymentStatus, type ShippingStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { CartService } from '../cart/cart.service';
import { ShippingService } from '../shipping/shipping.service';
import { InventoryService } from '../inventory/inventory.service';
import { PaymentsService, type PaymentChargeView } from '../payments/payments.service';
import {
  findPromotionIneligibility,
  applyPromotion,
  getIneligibilityMessage,
} from '../../common/utils/promotion-calculator';
import type { CheckoutDto } from './checkout.validation';

export interface CheckoutItemResponse {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface CheckoutResponse {
  order: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    shippingStatus: ShippingStatus;
    subtotal: number;
    discount: number;
    shippingFee: number;
    total: number;
    items: CheckoutItemResponse[];
    notes: string | null;
    couponCode: string | null;
  };
    payment: {
      id: string;
      method: string;
      status: PaymentStatus;
      amount: number;
      charge: PaymentChargeView | null;
    };
}

interface ValidatedCartItem {
  cartItemId: string;
  productId: string;
  name: string;
  sku: string;
  unitPrice: Prisma.Decimal;
  quantity: number;
  total: Prisma.Decimal;
}

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly shippingService: ShippingService,
    private readonly inventoryService: InventoryService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async checkout(userId: string, dto: CheckoutDto): Promise<CheckoutResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException({
        code: 'USER_INACTIVE',
        message: 'Usuário não autorizado a realizar compras',
      });
    }

    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, userId },
      select: {
        id: true,
        label: true,
        zipCode: true,
        street: true,
        number: true,
        complement: true,
        neighborhood: true,
        city: true,
        state: true,
        country: true,
      },
    });

    if (!address) {
      throw new NotFoundException('Endereço não encontrado');
    }

    const resolvedCart = await this.cartService.resolveActiveCart({ kind: 'user', userId });

    const cart = await this.prisma.cart.findUnique({
      where: { id: resolvedCart.id },
      include: {
        items: {
          include: {
            product: {
              include: { inventory: true },
            },
          },
          orderBy: { createdAt: 'asc' as const },
        },
        coupon: true,
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException({
        code: 'EMPTY_CART',
        message: 'Carrinho vazio',
      });
    }

    const validatedItems = this.validateItems(cart.items);
    const subtotal = validatedItems
      .reduce((acc, item) => acc.plus(item.total), new Prisma.Decimal(0))
      .toDecimalPlaces(2);

    let discount = new Prisma.Decimal(0);
    let freeShipping = false;
    let couponCode: string | null = null;

    if (cart.couponId && cart.coupon) {
      const ineligibility = findPromotionIneligibility(cart.coupon, subtotal);

      if (ineligibility) {
        throw new BadRequestException({
          code: ineligibility,
          message: getIneligibilityMessage(ineligibility),
        });
      }

      const application = applyPromotion(cart.coupon, subtotal);
      discount = application.discount;
      freeShipping = application.freeShipping;
      couponCode = application.code;
    }

    const shippingConfig = this.shippingService.getMethodConfig(dto.shippingMethod);
    const shippingFee = freeShipping
      ? new Prisma.Decimal(0)
      : shippingConfig.fee.toDecimalPlaces(2);

    const total = subtotal.minus(discount).plus(shippingFee).toDecimalPlaces(2);
    const orderNumber = this.generateOrderNumber();

    const result = await this.prisma.$transaction(
      async (tx) => {
        await this.inventoryService.reserveItems(tx, validatedItems);

        const order = await tx.order.create({
          data: {
            orderNumber,
            userId,
            status: 'PENDING_PAYMENT',
            paymentStatus: 'PENDING',
            shippingStatus: 'PENDING',
            subtotal,
            discount,
            shippingFee,
            total,
            addressSnapshot: address as unknown as Prisma.InputJsonValue,
            notes: dto.notes ?? null,
            items: {
              create: validatedItems.map((item) => ({
                productId: item.productId,
                productNameSnapshot: item.name,
                skuSnapshot: item.sku,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
                total: item.total,
              })),
            },
            shipping: {
              create: {
                method: dto.shippingMethod,
                status: 'PENDING',
                estimatedDays: shippingConfig.estimatedDays,
              },
            },
            payments: {
              create: {
                method: dto.paymentMethod,
                status: 'PENDING',
                amount: total,
              },
            },
          },
          include: {
            items: true,
            payments: true,
          },
        });

        if (cart.couponId) {
          await tx.promotionUsage.create({
            data: {
              promotionId: cart.couponId,
              orderId: order.id,
              userId,
              discount,
            },
          });

          await tx.promotion.update({
            where: { id: cart.couponId },
            data: { usageCount: { increment: 1 } },
          });
        }

        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        // userId é nulificado: a constraint unique em carts.user_id permite
        // apenas uma linha por usuário. Sem isso, o usuário ficaria
        // impossibilitado de criar um novo carrinho após o primeiro pedido.
        await tx.cart.update({
          where: { id: cart.id },
          data: { status: 'CONVERTED', couponId: null, userId: null },
        });

        return order;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );

    this.logger.log(
      `Order ${result.orderNumber} created for user ${userId} (total ${total.toNumber()})`,
    );

    const createdPayment = result.payments[0];

    if (!createdPayment) {
      throw new ConflictException({
        code: 'PAYMENT_REGISTRATION_FAILED',
        message: 'Falha ao registrar o pagamento do pedido',
      });
    }

    // Cobrança no gateway (Pix) após a transação do pedido. Falha aqui não
    // invalida o pedido: o cliente pode gerar nova cobrança via retry.
    const charge = await this.paymentsService.createInitialCharge(
      createdPayment,
      { id: result.id, orderNumber: result.orderNumber },
    );

    return {
      order: {
        id: result.id,
        orderNumber: result.orderNumber,
        status: result.status,
        paymentStatus: result.paymentStatus,
        shippingStatus: result.shippingStatus,
        subtotal: result.subtotal.toNumber(),
        discount: result.discount.toNumber(),
        shippingFee: result.shippingFee.toNumber(),
        total: result.total.toNumber(),
        items: result.items.map((item) => ({
          productId: item.productId,
          name: item.productNameSnapshot,
          sku: item.skuSnapshot,
          unitPrice: item.unitPrice.toNumber(),
          quantity: item.quantity,
          total: item.total.toNumber(),
        })),
        notes: result.notes,
        couponCode,
      },
      payment: {
        id: createdPayment.id,
        method: createdPayment.method,
        status: createdPayment.status,
        amount: createdPayment.amount.toNumber(),
        charge: charge
          ? {
              provider: charge.provider,
              transactionId: charge.transactionId,
              qrCode: charge.qrCode,
              expiresAt: charge.expiresAt,
            }
          : null,
      },
    };
  }

  private validateItems(
    items: Array<{
      id: string;
      quantity: number;
      product: {
        id: string;
        name: string;
        sku: string;
        price: Prisma.Decimal;
        isActive: boolean;
        inventory: { quantity: number; reservedQuantity: number } | null;
      } | null;
    }>,
  ): ValidatedCartItem[] {
    const failures: Array<{ field: string; message: string }> = [];
    const validated: ValidatedCartItem[] = [];

    for (const item of items) {
      const product = item.product;

      if (!product || !product.isActive) {
        failures.push({
          field: 'items',
          message: `Produto do carrinho indisponível (item ${item.id})`,
        });
        continue;
      }

      const available = product.inventory
        ? Math.max(0, product.inventory.quantity - product.inventory.reservedQuantity)
        : 0;

      if (item.quantity > available) {
        failures.push({
          field: 'items',
          message: `${product.name} (SKU ${product.sku}): disponível ${available}, solicitado ${item.quantity}`,
        });
        continue;
      }

      const unitPrice = new Prisma.Decimal(product.price);
      validated.push({
        cartItemId: item.id,
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unitPrice,
        quantity: item.quantity,
        total: unitPrice.mul(item.quantity),
      });
    }

    if (failures.length > 0) {
      throw new ConflictException({
        code: 'OUT_OF_STOCK',
        message: 'Alguns produtos estão com problemas de disponibilidade',
        details: failures,
      });
    }

    return validated;
  }

  private generateOrderNumber(): string {
    const now = new Date();
    const datePart = [
      now.getFullYear().toString().padStart(4, '0'),
      (now.getMonth() + 1).toString().padStart(2, '0'),
      now.getDate().toString().padStart(2, '0'),
    ].join('');
    const randomPart = randomBytes(3).toString('hex').toUpperCase();
    return `EH-${datePart}-${randomPart}`;
  }
}
