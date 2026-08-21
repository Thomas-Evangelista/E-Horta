import { Test } from '@nestjs/testing';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CheckoutService } from './checkout.service';
import { CartService } from '../cart/cart.service';
import { ShippingService } from '../shipping/shipping.service';
import { PrismaService } from '../../database/prisma.service';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let prisma: {
    user: { findUnique: jest.Mock };
    address: { findFirst: jest.Mock };
    cart: { findUnique: jest.Mock; update: jest.Mock };
    cartItem: { deleteMany: jest.Mock };
    order: { create: jest.Mock };
    promotionUsage: { create: jest.Mock };
    promotion: { update: jest.Mock };
    $transaction: jest.Mock;
    $executeRaw: jest.Mock;
  };
  let cartService: { resolveActiveCart: jest.Mock };
  let shippingService: { getMethodConfig: jest.Mock };

  const userId = 'user-1';
  const addressId = '0b8f6c1a-1111-4222-8333-444455556666';

  const dto = {
    addressId,
    shippingMethod: 'STANDARD' as const,
    paymentMethod: 'PIX' as const,
  };

  const address = {
    id: addressId,
    label: 'Casa',
    zipCode: '12345-678',
    street: 'Rua das Hortaliças',
    number: '10',
    complement: null,
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    country: 'BR',
  };

  const makeCartItem = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'cart-item-1',
    quantity: 2,
    product: {
      id: 'product-1',
      name: 'Alface',
      sku: 'ALF-001',
      price: new Prisma.Decimal('6.90'),
      isActive: true,
      inventory: { quantity: 10, reservedQuantity: 2 },
    },
    ...overrides,
  });

  const setupHappyPath = (overrides: { items?: unknown[]; coupon?: unknown } = {}) => {
    prisma.user.findUnique.mockResolvedValue({ id: userId, status: 'ACTIVE' });
    prisma.address.findFirst.mockResolvedValue(address);
    cartService.resolveActiveCart.mockResolvedValue({ id: 'cart-1' });
    prisma.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      couponId: overrides.coupon ? (overrides.coupon as { id: string }).id : null,
      coupon: overrides.coupon ?? null,
      items: overrides.items ?? [makeCartItem()],
    });
    prisma.$executeRaw.mockResolvedValue(1);
    prisma.order.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'order-1',
        orderNumber: 'EH-20260821-ABC123',
        status: 'PENDING_PAYMENT',
        paymentStatus: 'PENDING',
        shippingStatus: 'PENDING',
        subtotal: data.subtotal,
        discount: data.discount,
        shippingFee: data.shippingFee,
        total: data.total,
        addressSnapshot: address,
        notes: null,
        items: [
          {
            productId: 'product-1',
            productNameSnapshot: 'Alface',
            skuSnapshot: 'ALF-001',
            unitPrice: new Prisma.Decimal('6.90'),
            quantity: 2,
            total: new Prisma.Decimal('13.80'),
          },
        ],
        payment: {
          id: 'payment-1',
          method: dto.paymentMethod,
          status: 'PENDING',
          amount: data.total,
        },
      }),
    );
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      address: { findFirst: jest.fn() },
      cart: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
      cartItem: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      order: { create: jest.fn() },
      promotionUsage: { create: jest.fn().mockResolvedValue({}) },
      promotion: { update: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(),
      $executeRaw: jest.fn(),
    };

    cartService = { resolveActiveCart: jest.fn() };

    shippingService = {
      getMethodConfig: jest.fn().mockReturnValue({
        fee: new Prisma.Decimal('9.90'),
        estimatedDays: 2,
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: PrismaService, useValue: prisma },
        { provide: CartService, useValue: cartService },
        { provide: ShippingService, useValue: shippingService },
      ],
    }).compile();

    service = moduleRef.get(CheckoutService);

    prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
    setupHappyPath();
  });

  it('deve criar pedido com reserva de estoque, pagamento pendente e carrinho convertido', async () => {
    const result = await service.checkout(userId, dto);

    expect(prisma.$executeRaw).toHaveBeenCalled();

    expect(prisma.order.create).toHaveBeenCalledTimes(1);
    expect(prisma.cart.update).toHaveBeenCalledWith({
      where: { id: 'cart-1' },
      data: { status: 'CONVERTED', couponId: null },
    });
    expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 'cart-1' } });

    expect(result.order.orderNumber).toMatch(/^EH-\d{8}-[0-9A-F]{6}$/);
    expect(result.order.status).toBe('PENDING_PAYMENT');
    expect(result.payment.status).toBe('PENDING');
    expect(result.order.total).toBeCloseTo(23.7); // 13.80 - 0 + 9.90
  });

  it('deve recalcular preços a partir do preço atual dos produtos', async () => {
    await service.checkout(userId, dto);

    const createCall = prisma.order.create.mock.calls[0][0];
    expect(createCall.data.subtotal.toNumber()).toBe(13.8);
    expect(createCall.data.items.create[0].unitPrice.toNumber()).toBe(6.9);
    // Snapshots obrigatórios
    expect(createCall.data.items.create[0].productNameSnapshot).toBe('Alface');
    expect(createCall.data.items.create[0].skuSnapshot).toBe('ALF-001');
    expect(createCall.data.addressSnapshot).toEqual(expect.objectContaining({ zipCode: '12345-678' }));
  });

  it('deve lançar UnauthorizedException para usuário inexistente ou inativo', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.checkout(userId, dto)).rejects.toMatchObject({
      response: { code: 'USER_INACTIVE' },
    });
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('deve lançar NotFoundException quando endereço não pertence ao usuário', async () => {
    prisma.address.findFirst.mockResolvedValue(null);

    await expect(service.checkout(userId, dto)).rejects.toThrow(NotFoundException);
  });

  it('deve lançar EMPTY_CART para carrinho vazio', async () => {
    setupHappyPath({ items: [] });

    await expect(service.checkout(userId, dto)).rejects.toMatchObject({
      response: { code: 'EMPTY_CART' },
    });
  });

  it('deve lançar OUT_OF_STOCK sem reservar nada quando um item não tem estoque', async () => {
    setupHappyPath({
      items: [
        makeCartItem(),
        makeCartItem({
          id: 'cart-item-2',
          product: {
            id: 'product-2',
            name: 'Tomate',
            sku: 'TOM-001',
            price: new Prisma.Decimal('4.50'),
            isActive: true,
            inventory: { quantity: 1, reservedQuantity: 1 },
          },
        }),
      ],
    });

    await expect(service.checkout(userId, dto)).rejects.toMatchObject({
      response: { code: 'OUT_OF_STOCK' },
    });
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('deve lançar OUT_OF_STOCK quando a reserva condicional falha na escrita', async () => {
    prisma.$executeRaw.mockResolvedValue(0);

    await expect(service.checkout(userId, dto)).rejects.toMatchObject({
      response: { code: 'OUT_OF_STOCK' },
    });
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('deve lançar erro quando produto está inativo', async () => {
    setupHappyPath({
      items: [makeCartItem({ product: { ...(makeCartItem().product as object), isActive: false } })],
    });

    await expect(service.checkout(userId, dto)).rejects.toBeInstanceOf(ConflictException);
  });

  describe('cupom no checkout', () => {
    const coupon = {
      id: 'promo-1',
      code: 'VERAO10',
      name: 'Verão 10%',
      type: 'PERCENTAGE',
      value: new Prisma.Decimal(10),
      minimumOrderValue: null,
      maxDiscount: null,
      startsAt: new Date('2026-01-01T00:00:00Z'),
      endsAt: new Date('2099-12-31T23:59:59Z'),
      usageLimit: null,
      usageCount: 0,
      isActive: true,
    };

    it('deve aplicar desconto percentual e somar frete', async () => {
      setupHappyPath({ coupon });

      const result = await service.checkout(userId, dto);

      const createCall = prisma.order.create.mock.calls[0][0];
      // subtotal 13.80 - 10% (1.38) + frete 9.90
      expect(createCall.data.discount.toNumber()).toBe(1.38);
      expect(createCall.data.shippingFee.toNumber()).toBe(9.9);
      expect(result.order.couponCode).toBe('VERAO10');
      expect(result.order.total).toBeCloseTo(22.32);
    });

    it('deve zerar o frete para cupom FREE_SHIPPING', async () => {
      setupHappyPath({
        coupon: { ...coupon, type: 'FREE_SHIPPING', value: new Prisma.Decimal(0) },
      });

      const result = await service.checkout(userId, dto);

      const createCall = prisma.order.create.mock.calls[0][0];
      expect(createCall.data.shippingFee.toNumber()).toBe(0);
      expect(result.order.total).toBeCloseTo(13.8); // 13.80 - 0 + 0
    });

    it('deve registrar uso da promoção e incrementar contador', async () => {
      setupHappyPath({ coupon });

      await service.checkout(userId, dto);

      expect(prisma.promotionUsage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          promotionId: 'promo-1',
          userId,
        }),
      });
      expect(prisma.promotion.update).toHaveBeenCalledWith({
        where: { id: 'promo-1' },
        data: { usageCount: { increment: 1 } },
      });
    });

    it('deve bloquear checkout quando cupom ficou inválido desde a aplicação', async () => {
      setupHappyPath({
        coupon: { ...coupon, minimumOrderValue: new Prisma.Decimal(100) },
      });

      await expect(service.checkout(userId, dto)).rejects.toMatchObject({
        response: { code: 'MINIMUM_ORDER_VALUE' },
      });
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
      expect(prisma.order.create).not.toHaveBeenCalled();
    });
  });

  it('deve propagar BadRequestException em validações de entrada', async () => {
    prisma.cart.findUnique.mockResolvedValue(null);

    await expect(service.checkout(userId, dto)).rejects.toBeInstanceOf(BadRequestException);
  });
});
