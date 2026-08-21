import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PromotionsService } from './promotions.service';
import { CartService } from '../cart/cart.service';
import { PrismaService } from '../../database/prisma.service';
import { applyCouponSchema } from './promotions.validation';

describe('PromotionsService', () => {
  let service: PromotionsService;
  let prisma: {
    promotion: { findUnique: jest.Mock };
    cart: { update: jest.Mock };
  };
  let cartService: {
    resolveActiveCart: jest.Mock;
    getCartSubtotal: jest.Mock;
    getCart: jest.Mock;
  };

  const owner = { kind: 'user' as const, userId: 'user-1' };
  const cart = { id: 'cart-1', couponId: null };

  const makePromotion = (overrides: Partial<Record<string, unknown>> = {}) => ({
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
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      promotion: { findUnique: jest.fn() },
      cart: { update: jest.fn().mockResolvedValue({}) },
    };

    cartService = {
      resolveActiveCart: jest.fn().mockResolvedValue(cart),
      getCartSubtotal: jest.fn().mockResolvedValue(new Prisma.Decimal('50.00')),
      getCart: jest.fn().mockResolvedValue({ id: 'cart-1', items: [], subtotal: 50 }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PromotionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CartService, useValue: cartService },
      ],
    }).compile();

    service = moduleRef.get(PromotionsService);
  });

  describe('applyCoupon', () => {
    it('deve aplicar cupom válido ao carrinho', async () => {
      const promotion = makePromotion();
      prisma.promotion.findUnique.mockResolvedValue(promotion);

      await service.applyCoupon(owner, { code: 'VERAO10' });

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { couponId: 'promo-1' },
      });
      expect(cartService.getCart).toHaveBeenCalledWith(owner);
    });

    it('deve normalizar o código para maiúsculas', async () => {
      prisma.promotion.findUnique.mockResolvedValue(makePromotion());

      await service.applyCoupon(owner, applyCouponSchema.parse({ code: '  verao10  ' }));

      expect(prisma.promotion.findUnique).toHaveBeenCalledWith({
        where: { code: 'VERAO10' },
      });
    });

    it('deve lançar COUPON_NOT_FOUND para cupom inexistente', async () => {
      prisma.promotion.findUnique.mockResolvedValue(null);

      await expect(service.applyCoupon(owner, { code: 'INEXISTENTE' })).rejects.toMatchObject({
        response: { code: 'COUPON_NOT_FOUND' },
      });
      expect(prisma.cart.update).not.toHaveBeenCalled();
    });

    it.each([
      ['PROMOTION_INACTIVE', makePromotion({ isActive: false })],
      ['PROMOTION_EXPIRED', makePromotion({ endsAt: new Date('2020-01-01T00:00:00Z') })],
      [
        'PROMOTION_USAGE_LIMIT',
        makePromotion({ usageLimit: 10, usageCount: 10 }),
      ],
      [
        'MINIMUM_ORDER_VALUE',
        makePromotion({ minimumOrderValue: new Prisma.Decimal(100) }),
      ],
    ])('deve bloquear cupom inválido (%s)', async (expectedCode, promotion) => {
      prisma.promotion.findUnique.mockResolvedValue(promotion);

      await expect(service.applyCoupon(owner, { code: 'VERAO10' })).rejects.toMatchObject({
        response: { code: expectedCode },
      });
      expect(prisma.cart.update).not.toHaveBeenCalled();
    });
  });

  describe('removeCoupon', () => {
    it('deve remover cupom aplicado', async () => {
      cartService.resolveActiveCart.mockResolvedValue({ ...cart, couponId: 'promo-1' });

      await service.removeCoupon(owner);

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { couponId: null },
      });
    });

    it('não deve atualizar quando não há cupom aplicado', async () => {
      await service.removeCoupon(owner);

      expect(prisma.cart.update).not.toHaveBeenCalled();
      expect(cartService.getCart).toHaveBeenCalledWith(owner);
    });
  });
});
