import { z } from 'zod';

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Slug deve ter pelo menos 3 caracteres')
  .max(120, 'Slug deve ter no máximo 120 caracteres')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug inválido: use apenas letras minúsculas, números e hífens');

export const createCategorySchema = z.object({
  name: z.string().trim().min(3, 'Nome deve ter pelo menos 3 caracteres').max(80),
  slug: slugSchema,
  description: z.string().trim().max(1000).optional(),
  imageUrl: z.string().url('URL da imagem inválida').max(2048).optional(),
  sortOrder: z.number().int('Ordem deve ser um número inteiro').min(0).default(0),
});

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: z.string().trim().min(3, 'Nome deve ter pelo menos 3 caracteres').max(80).optional(),
  slug: slugSchema.optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  imageUrl: z.string().url('URL da imagem inválida').max(2048).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int('Ordem deve ser um número inteiro').min(0).optional(),
});

export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
