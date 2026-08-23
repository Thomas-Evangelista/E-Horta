import { z } from 'zod';

export const applyCouponSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Informe o código do cupom')
    .max(64, 'Código do cupom inválido')
    .transform((value) => value.toUpperCase()),
});

export type ApplyCouponDto = z.infer<typeof applyCouponSchema>;

export const promotionTypeValues = ['PERCENTAGE', 'FIXED', 'FREE_SHIPPING'] as const;

const promotionCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(3, 'Código deve ter pelo menos 3 caracteres')
  .max(32, 'Código deve ter no máximo 32 caracteres')
  .regex(/^[A-Z0-9_-]+$/, 'Código inválido: use apenas letras maiúsculas, números, hífen ou sublinhado');

const promotionBaseFields = {
  code: promotionCodeSchema,
  name: z.string().trim().min(3, 'Nome deve ter pelo menos 3 caracteres').max(80),
  type: z.enum(promotionTypeValues, {
    errorMap: () => ({ message: 'Tipo de promoção inválido' }),
  }),
  value: z
    .number({ invalid_type_error: 'Valor inválido' })
    .nonnegative('Valor não pode ser negativo')
    .max(999999.99),
  minimumOrderValue: z.number().nonnegative('Valor mínimo não pode ser negativo').max(999999.99).optional(),
  maxDiscount: z.number().positive('Desconto máximo deve ser maior que zero').max(999999.99).optional(),
  startsAt: z.coerce.date({ invalid_type_error: 'Data de início inválida' }),
  endsAt: z.coerce.date({ invalid_type_error: 'Data de término inválida' }),
  usageLimit: z.number().int('Limite de usos deve ser um número inteiro').min(1).max(1000000).optional(),
};

export const createPromotionSchema = z
  .object(promotionBaseFields)
  .refine((data) => data.type === 'PERCENTAGE' || data.value > 0, {
    message: 'Valor deve ser maior que zero',
    path: ['value'],
  })
  .refine((data) => data.type !== 'PERCENTAGE' || data.value <= 100, {
    message: 'Percentual não pode ser maior que 100',
    path: ['value'],
  })
  .refine((data) => data.endsAt > data.startsAt, {
    message: 'Data de término deve ser posterior à data de início',
    path: ['endsAt'],
  });

export type CreatePromotionDto = z.infer<typeof createPromotionSchema>;

export const updatePromotionSchema = z
  .object({
    code: promotionCodeSchema.optional(),
    name: z.string().trim().min(3, 'Nome deve ter pelo menos 3 caracteres').max(80).optional(),
    type: z.enum(promotionTypeValues).optional(),
    value: z.number().nonnegative('Valor não pode ser negativo').max(999999.99).optional(),
    minimumOrderValue: z.number().nonnegative('Valor mínimo não pode ser negativo').max(999999.99).nullable().optional(),
    maxDiscount: z.number().positive('Desconto máximo deve ser maior que zero').max(999999.99).nullable().optional(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    usageLimit: z.number().int('Limite de usos deve ser um número inteiro').min(1).max(1000000).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => !data.startsAt || !data.endsAt || data.endsAt > data.startsAt, {
    message: 'Data de término deve ser posterior à data de início',
    path: ['endsAt'],
  });

export type UpdatePromotionDto = z.infer<typeof updatePromotionSchema>;

export const adminPromotionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
  isActive: z.preprocess((value) => {
    if (typeof value === 'string') return value === 'true';
    return value;
  }, z.boolean()).optional(),
});

export type AdminPromotionsQueryDto = z.infer<typeof adminPromotionsQuerySchema>;
