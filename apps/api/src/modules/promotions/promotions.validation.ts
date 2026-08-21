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
