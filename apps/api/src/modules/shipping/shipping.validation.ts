import { z } from 'zod';

export const shippingMethodSchema = z.enum(['STANDARD', 'EXPRESS']);
export type ShippingMethodDto = z.infer<typeof shippingMethodSchema>;

export const quoteSchema = z.object({
  addressId: z.string().uuid('ID do endereço inválido'),
  items: z
    .array(
      z.object({
        productId: z.string().uuid('ID do produto inválido'),
        quantity: z
          .number()
          .int('Quantidade deve ser um número inteiro')
          .min(1, 'Quantidade deve ser no mínimo 1')
          .max(999, 'Quantidade deve ser no máximo 999'),
      }),
    )
    .min(1, 'Informe ao menos um item para calcular a entrega'),
});

export type QuoteDto = z.infer<typeof quoteSchema>;
