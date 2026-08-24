import { z } from 'zod';
import { ReviewStatus } from '@prisma/client';

export const reviewStatusValues = Object.values(ReviewStatus) as [
  ReviewStatus,
  ...ReviewStatus[],
];

export const createReviewSchema = z.object({
  rating: z.coerce
    .number({ invalid_type_error: 'Avaliação deve ser um número' })
    .int('Avaliação deve ser um número inteiro')
    .min(1, 'Avaliação deve ser entre 1 e 5')
    .max(5, 'Avaliação deve ser entre 1 e 5'),
  comment: z
    .string()
    .trim()
    .min(3, 'Comentário deve ter pelo menos 3 caracteres')
    .max(1000, 'Comentário deve ter no máximo 1000 caracteres')
    .optional(),
});

export type CreateReviewDto = z.infer<typeof createReviewSchema>;

export const reviewsQuerySchema = z.object({
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

export type ReviewsQueryDto = z.infer<typeof reviewsQuerySchema>;

export const adminReviewsQuerySchema = reviewsQuerySchema.extend({
  status: z.enum(reviewStatusValues, {
    errorMap: () => ({ message: 'Status de avaliação inválido' }),
  }).optional(),
});

export type AdminReviewsQueryDto = z.infer<typeof adminReviewsQuerySchema>;

export const moderateReviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'] as const, {
    errorMap: () => ({ message: 'Status deve ser APPROVED ou REJECTED' }),
  }),
});

export type ModerateReviewDto = z.infer<typeof moderateReviewSchema>;
