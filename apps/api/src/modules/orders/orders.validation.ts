import { z } from 'zod';
import { OrderStatus } from '@prisma/client';

export const orderStatusValues = Object.values(OrderStatus) as [
  OrderStatus,
  ...OrderStatus[],
];

export const ordersQuerySchema = z.object({
  page: z.coerce
    .number({ invalid_type_error: 'Página deve ser um número' })
    .int('Página deve ser um número inteiro')
    .min(1, 'Página deve ser maior ou igual a 1')
    .default(1),
  limit: z.coerce
    .number({ invalid_type_error: 'Limite deve ser um número' })
    .int('Limite deve ser um número inteiro')
    .min(1, 'Limite deve ser maior ou igual a 1')
    .max(100, 'Limite deve ser no máximo 100')
    .default(20),
});

export type OrdersQueryDto = z.infer<typeof ordersQuerySchema>;

export const cancelOrderSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Motivo deve ter pelo menos 3 caracteres')
    .max(500, 'Motivo deve ter no máximo 500 caracteres')
    .optional(),
});

export type CancelOrderDto = z.infer<typeof cancelOrderSchema>;

export const adminOrdersQuerySchema = ordersQuerySchema.extend({
  status: z.enum(orderStatusValues, {
    errorMap: () => ({ message: 'Status de pedido inválido' }),
  }).optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

export type AdminOrdersQueryDto = z.infer<typeof adminOrdersQuerySchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum(orderStatusValues, {
    errorMap: () => ({ message: 'Status de pedido inválido' }),
  }),
  reason: z.string().trim().max(500, 'Motivo deve ter no máximo 500 caracteres').optional(),
});

export type UpdateOrderStatusDto = z.infer<typeof updateOrderStatusSchema>;
