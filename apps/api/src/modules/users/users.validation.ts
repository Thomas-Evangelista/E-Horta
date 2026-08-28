import { z } from 'zod';

export const userRoleValues = ['CUSTOMER', 'OPERATOR', 'ADMIN'] as const;
export const userStatusValues = ['ACTIVE', 'INACTIVE', 'BLOCKED'] as const;

export const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
  role: z.enum(userRoleValues, {
    errorMap: () => ({ message: 'Perfil inválido' }),
  }).optional(),
  status: z.enum(userStatusValues, {
    errorMap: () => ({ message: 'Status inválido' }),
  }).optional(),
});

export type AdminUsersQueryDto = z.infer<typeof adminUsersQuerySchema>;

export const updateUserStatusSchema = z.object({
  status: z.enum(userStatusValues, {
    errorMap: () => ({ message: 'Status inválido' }),
  }),
});

export type UpdateUserStatusDto = z.infer<typeof updateUserStatusSchema>;
