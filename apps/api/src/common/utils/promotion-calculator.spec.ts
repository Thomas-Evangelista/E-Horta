import { Prisma } from '@prisma/client';
import {
  findPromotionIneligibility,
  applyPromotion,
  type PromotionLike,
} from './promotion-calculator';

const NOW = new Date('2026-06-15T12:00:00Z');

const makePromotion = (overrides: Partial<PromotionLike> = {}): PromotionLike => ({
  code: 'VERAO10',
  name: 'Verão 10%',
  type: 'PERCENTAGE',
  value: new Prisma.Decimal(10),
  minimumOrderValue: null,
  maxDiscount: null,
  startsAt: new Date('2026-01-01T00:00:00Z'),
  endsAt: new Date('2026-12-31T23:59:59Z'),
  usageLimit: null,
  usageCount: 0,
  isActive: true,
  ...overrides,
});

describe('findPromotionIneligibility', () => {
  it('deve retornar null para promoção elegível', () => {
    const subtotal = new Prisma.Decimal('50.00');
    expect(findPromotionIneligibility(makePromotion(), subtotal, NOW)).toBeNull();
  });

  it('deve detectar promoção inativa', () => {
    const result = findPromotionIneligibility(
      makePromotion({ isActive: false }),
      new Prisma.Decimal(50),
      NOW,
    );
    expect(result).toBe('PROMOTION_INACTIVE');
  });

  it('deve detectar promoção ainda não iniciada', () => {
    const result = findPromotionIneligibility(
      makePromotion({ startsAt: new Date('2026-07-01T00:00:00Z') }),
      new Prisma.Decimal(50),
      NOW,
    );
    expect(result).toBe('PROMOTION_NOT_STARTED');
  });

  it('deve detectar promoção expirada', () => {
    const result = findPromotionIneligibility(
      makePromotion({ endsAt: new Date('2026-06-15T11:59:59Z') }),
      new Prisma.Decimal(50),
      NOW,
    );
    expect(result).toBe('PROMOTION_EXPIRED');
  });

  it('deve detectar limite de uso atingido', () => {
    const result = findPromotionIneligibility(
      makePromotion({ usageLimit: 100, usageCount: 100 }),
      new Prisma.Decimal(50),
      NOW,
    );
    expect(result).toBe('PROMOTION_USAGE_LIMIT');
  });

  it('deve detectar valor mínimo do pedido não atingido', () => {
    const result = findPromotionIneligibility(
      makePromotion({ minimumOrderValue: new Prisma.Decimal(60) }),
      new Prisma.Decimal('59.99'),
      NOW,
    );
    expect(result).toBe('MINIMUM_ORDER_VALUE');
  });

  it('deve aceitar subtotal exatamente igual ao valor mínimo', () => {
    const result = findPromotionIneligibility(
      makePromotion({ minimumOrderValue: new Prisma.Decimal(60) }),
      new Prisma.Decimal('60.00'),
      NOW,
    );
    expect(result).toBeNull();
  });
});

describe('applyPromotion', () => {
  it('deve calcular desconto percentual', () => {
    const application = applyPromotion(
      makePromotion({ type: 'PERCENTAGE', value: new Prisma.Decimal(10) }),
      new Prisma.Decimal('47.30'),
    );

    expect(application.discount.toNumber()).toBe(4.73);
    expect(application.freeShipping).toBe(false);
  });

  it('deve respeitar o desconto máximo em promoção percentual', () => {
    const application = applyPromotion(
      makePromotion({
        type: 'PERCENTAGE',
        value: new Prisma.Decimal(50),
        maxDiscount: new Prisma.Decimal(20),
      }),
      new Prisma.Decimal(100),
    );

    expect(application.discount.toNumber()).toBe(20);
  });

  it('deve calcular desconto fixo sem exceder o subtotal', () => {
    const application = applyPromotion(
      makePromotion({ type: 'FIXED', value: new Prisma.Decimal(15) }),
      new Prisma.Decimal('9.90'),
    );

    expect(application.discount.toNumber()).toBe(9.9);
  });

  it('deve marcar frete grátis para FREE_SHIPPING sem desconto no subtotal', () => {
    const application = applyPromotion(
      makePromotion({ type: 'FREE_SHIPPING' }),
      new Prisma.Decimal('30.00'),
    );

    expect(application.discount.toNumber()).toBe(0);
    expect(application.freeShipping).toBe(true);
  });

  it('deve arredondar desconto percentual para duas casas decimais', () => {
    const application = applyPromotion(
      makePromotion({ type: 'PERCENTAGE', value: new Prisma.Decimal(15) }),
      new Prisma.Decimal('19.99'),
    );

    // 19.99 * 0.15 = 2.9985 → 3.00
    expect(application.discount.toNumber()).toBe(3);
  });
});
