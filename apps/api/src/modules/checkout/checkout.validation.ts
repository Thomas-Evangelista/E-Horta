import { z } from 'zod';
import { shippingMethodSchema } from '../shipping/shipping.validation';

export const checkoutSchema = z.object({
  addressId: z.string().uuid('ID do endereço inválido'),
  shippingMethod: shippingMethodSchema,
  paymentMethod: z.enum(['PIX', 'CARD', 'CASH'], {
    errorMap: () => ({ message: 'Forma de pagamento inválida' }),
  }),
  notes: z.string().trim().max(500, 'Observações devem ter no máximo 500 caracteres').optional(),
});

export type CheckoutDto = z.infer<typeof checkoutSchema>;
