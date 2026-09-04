import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Nome deve ter no mínimo 2 caracteres')
      .max(100, 'Nome deve ter no máximo 100 caracteres')
      .trim(),
    email: z.string().email('E-mail inválido').toLowerCase().trim(),
    password: z
      .string()
      .min(8, 'Senha deve ter no mínimo 8 caracteres')
      .max(128, 'Senha deve ter no máximo 128 caracteres'),
    confirmPassword: z.string(),
    phone: z
      .string()
      .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos')
      .optional(),
    cartToken: z.string().min(20).max(2048).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido').toLowerCase().trim(),
  password: z.string().min(1, 'Senha é obrigatória'),
  cartToken: z.string().min(20).max(2048).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido').toLowerCase().trim(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Token é obrigatório'),
    password: z
      .string()
      .min(8, 'Senha deve ter no mínimo 8 caracteres')
      .max(128, 'Senha deve ter no máximo 128 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z
      .string()
      .min(8, 'Senha deve ter no mínimo 8 caracteres')
      .max(128, 'Senha deve ter no máximo 128 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'A nova senha deve ser diferente da atual',
    path: ['newPassword'],
  });

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
