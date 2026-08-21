import { Prisma, type PromotionType } from '@prisma/client';

export interface PromotionLike {
  code: string;
  name: string;
  type: PromotionType;
  value: Prisma.Decimal | string | number;
  minimumOrderValue: Prisma.Decimal | string | number | null;
  maxDiscount: Prisma.Decimal | string | number | null;
  startsAt: Date;
  endsAt: Date;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
}

export type PromotionIneligibilityCode =
  | 'PROMOTION_INACTIVE'
  | 'PROMOTION_NOT_STARTED'
  | 'PROMOTION_EXPIRED'
  | 'PROMOTION_USAGE_LIMIT'
  | 'MINIMUM_ORDER_VALUE';

export const INELIGIBILITY_MESSAGES: Record<PromotionIneligibilityCode, string> = {
  PROMOTION_INACTIVE: 'Cupom inativo',
  PROMOTION_NOT_STARTED: 'Cupom ainda não está válido',
  PROMOTION_EXPIRED: 'Cupom expirado',
  PROMOTION_USAGE_LIMIT: 'Cupom atingiu o limite de uso',
  MINIMUM_ORDER_VALUE: 'Valor mínimo do pedido não atingido para este cupom',
};

export function getIneligibilityMessage(code: PromotionIneligibilityCode): string {
  return INELIGIBILITY_MESSAGES[code];
}

export interface PromotionApplication {
  code: string;
  name: string;
  type: PromotionType;
  discount: Prisma.Decimal;
  freeShipping: boolean;
}

const toDecimal = (value: Prisma.Decimal | string | number | null): Prisma.Decimal =>
  new Prisma.Decimal(value ?? 0);

export function findPromotionIneligibility(
  promotion: PromotionLike,
  subtotal: Prisma.Decimal,
  now: Date = new Date(),
): PromotionIneligibilityCode | null {
  if (!promotion.isActive) {
    return 'PROMOTION_INACTIVE';
  }
  if (promotion.startsAt.getTime() > now.getTime()) {
    return 'PROMOTION_NOT_STARTED';
  }
  if (promotion.endsAt.getTime() < now.getTime()) {
    return 'PROMOTION_EXPIRED';
  }
  if (promotion.usageLimit !== null && promotion.usageCount >= promotion.usageLimit) {
    return 'PROMOTION_USAGE_LIMIT';
  }
  const minimumOrderValue = toDecimal(promotion.minimumOrderValue);
  if (minimumOrderValue.gt(0) && subtotal.lt(minimumOrderValue)) {
    return 'MINIMUM_ORDER_VALUE';
  }
  return null;
}

export function applyPromotion(
  promotion: PromotionLike,
  subtotal: Prisma.Decimal,
): PromotionApplication {
  let discount = new Prisma.Decimal(0);
  let freeShipping = false;

  switch (promotion.type) {
    case 'PERCENTAGE': {
      discount = subtotal.mul(toDecimal(promotion.value)).div(100);
      break;
    }
    case 'FIXED': {
      discount = Prisma.Decimal.min(toDecimal(promotion.value), subtotal);
      break;
    }
    case 'FREE_SHIPPING': {
      freeShipping = true;
      break;
    }
  }

  const maxDiscount = toDecimal(promotion.maxDiscount);
  if (maxDiscount.gt(0)) {
    discount = Prisma.Decimal.min(discount, maxDiscount);
  }

  return {
    code: promotion.code,
    name: promotion.name,
    type: promotion.type,
    discount: discount.toDecimalPlaces(2),
    freeShipping,
  };
}
