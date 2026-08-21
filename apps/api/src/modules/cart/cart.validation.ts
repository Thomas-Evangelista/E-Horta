import { z } from 'zod';

export const addItemSchema = z.object({
  productId: z.string().uuid('ID do produto inválido'),
  quantity: z
    .number()
    .int('Quantidade deve ser um número inteiro')
    .min(1, 'Quantidade deve ser no mínimo 1')
    .max(999, 'Quantidade deve ser no máximo 999'),
});

export const updateItemSchema = z.object({
  quantity: z
    .number()
    .int('Quantidade deve ser um número inteiro')
    .min(1, 'Quantidade deve ser no mínimo 1')
    .max(999, 'Quantidade deve ser no máximo 999'),
});

export type AddItemDto = z.infer<typeof addItemSchema>;
export type UpdateItemDto = z.infer<typeof updateItemSchema>;
