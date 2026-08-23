import { z } from 'zod';

export const productUnitValues = ['UN', 'KG', 'G', 'PACK', 'BUNCH'] as const;

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Slug deve ter pelo menos 3 caracteres')
  .max(120, 'Slug deve ter no máximo 120 caracteres')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug inválido: use apenas letras minúsculas, números e hífens');

const skuSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(2, 'SKU deve ter pelo menos 2 caracteres')
  .max(32, 'SKU deve ter no máximo 32 caracteres')
  .regex(/^[A-Z0-9-]+$/, 'SKU inválido: use apenas letras maiúsculas, números e hífens');

export const createProductSchema = z.object({
  categoryId: z.string().uuid('Categoria inválida'),
  name: z.string().trim().min(3, 'Nome deve ter pelo menos 3 caracteres').max(120),
  slug: slugSchema,
  description: z.string().trim().max(5000).optional(),
  shortDescription: z.string().trim().max(255).optional(),
  sku: skuSchema,
  unit: z.enum(productUnitValues).default('UN'),
  weight: z.number().positive('Peso deve ser maior que zero').max(1000).optional(),
  price: z.number().positive('Preço deve ser maior que zero').max(999999.99),
  compareAtPrice: z.number().positive('Preço comparativo deve ser maior que zero').max(999999.99).optional(),
  costPrice: z.number().nonnegative('Custo não pode ser negativo').max(999999.99).optional(),
  imageUrl: z.string().url('URL da imagem inválida').max(2048).optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

export type CreateProductDto = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  categoryId: z.string().uuid('Categoria inválida').optional(),
  name: z.string().trim().min(3, 'Nome deve ter pelo menos 3 caracteres').max(120).optional(),
  slug: slugSchema.optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  shortDescription: z.string().trim().max(255).nullable().optional(),
  sku: skuSchema.optional(),
  unit: z.enum(productUnitValues).optional(),
  weight: z.number().positive('Peso deve ser maior que zero').max(1000).nullable().optional(),
  price: z.number().positive('Preço deve ser maior que zero').max(999999.99).optional(),
  compareAtPrice: z.number().positive('Preço comparativo deve ser maior que zero').max(999999.99).nullable().optional(),
  costPrice: z.number().nonnegative('Custo não pode ser negativo').max(999999.99).nullable().optional(),
  imageUrl: z.string().url('URL da imagem inválida').max(2048).nullable().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export type UpdateProductDto = z.infer<typeof updateProductSchema>;

export const adminProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
  categoryId: z.string().uuid().optional(),
  isActive: z.preprocess((value) => {
    if (typeof value === 'string') return value === 'true';
    return value;
  }, z.boolean()).optional(),
});

export type AdminProductsQueryDto = z.infer<typeof adminProductsQuerySchema>;
