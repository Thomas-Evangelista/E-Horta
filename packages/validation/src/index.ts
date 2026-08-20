import { z } from 'zod';

export const emailSchema = z.string().email('E-mail inválido').toLowerCase().trim();

export const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .max(128, 'Senha deve ter no máximo 128 caracteres');

export const nameSchema = z
  .string()
  .min(2, 'Nome deve ter no mínimo 2 caracteres')
  .max(100, 'Nome deve ter no máximo 100 caracteres')
  .trim();

export const phoneSchema = z
  .string()
  .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos')
  .optional();

export const uuidSchema = z.string().uuid('ID inválido');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const moneySchema = z.number().positive('Valor deve ser positivo');

export const cepSchema = z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido');

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: passwordSchema,
    phone: phoneSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const addressSchema = z.object({
  label: z.enum(['Casa', 'Trabalho', 'Outro']).default('Casa'),
  zipCode: cepSchema,
  street: z.string().min(1, 'Rua é obrigatória'),
  number: z.string().min(1, 'Número é obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, 'Bairro é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().length(2, 'Estado deve ter 2 caracteres'),
  country: z.string().default('BR'),
  isDefault: z.boolean().default(false),
});

export const productFilterSchema = paginationSchema.extend({
  category: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  search: z.string().optional(),
  featured: z.coerce.boolean().optional(),
  available: z.coerce.boolean().optional(),
  promotion: z.coerce.boolean().optional(),
  sort: z.enum(['price-asc', 'price-desc', 'name-asc', 'name-desc', 'newest']).optional(),
});

export const addToCartSchema = z.object({
  productId: uuidSchema,
  quantity: z.number().int().min(1, 'Quantidade deve ser no mínimo 1'),
});

export const checkoutSchema = z.object({
  addressId: uuidSchema,
  paymentMethod: z.enum(['PIX', 'CARD', 'CASH']),
  couponCode: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type ProductFilterInput = z.infer<typeof productFilterSchema>;
export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
