'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordStrengthMeter } from '@/components/ui/password-strength-meter';
import { getStoredCartToken, clearStoredCartToken } from '@/lib/cart-token';
import { applyApiFieldErrors } from '@/lib/form-errors';
import { registerRequest, useSessionStore } from '@/stores/session';

const registerFormSchema = z
  .object({
    name: z.string().trim().min(2, 'Informe seu nome completo').max(100),
    email: z.string().email('Informe um e-mail vÃ¡lido'),
    phone: z
      .string()
      .regex(/^\d{10,11}$/, 'Use apenas nÃºmeros com DDD (ex.: 11999998888)')
      .optional()
      .or(z.literal('')),
    password: z.string().min(8, 'A senha deve ter no mÃ­nimo 8 caracteres').max(128),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Senhas nÃ£o conferem',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerFormSchema>;

export function CadastroContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/';
  const queryClient = useQueryClient();
  const setSession = useSessionStore((state) => state.setSession);
  const [completedName, setCompletedName] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerFormSchema) });

  const password = watch('password') ?? '';

  // Redireciona automaticamente apÃ³s o estado de sucesso ser exibido.
  useEffect(() => {
    if (!completedName) return;
    const timer = window.setTimeout(() => {
      router.push(redirectTo);
      router.refresh();
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [completedName, redirectTo, router]);

  async function onSubmit(values: RegisterFormValues) {
    try {
      const cartToken = getStoredCartToken() ?? undefined;
      const { user, tokens } = await registerRequest({
        name: values.name,
        email: values.email,
        password: values.password,
        confirmPassword: values.confirmPassword,
        phone: values.phone ? values.phone : undefined,
        cartToken,
      });
      setSession(user, tokens);
      clearStoredCartToken();
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
      setCompletedName(user.name.split(' ')[0]);
    } catch (error) {
      const handled = applyApiFieldErrors(error, (field, fieldError) =>
        setError(field as keyof RegisterFormValues, fieldError),
      );
      if (!handled) {
        setError('root', { message: 'Algo deu errado. Tente novamente em instantes.' });
      }
    }
  }

  if (completedName) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 py-20 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          aria-hidden
          className="flex h-16 w-16 items-center justify-center rounded-full bg-leaf-600 text-3xl text-white"
        >
          âœ“
        </motion.div>
        <h1 className="text-xl font-extrabold text-ink-900">Conta criada!</h1>
        <p className="text-sm text-ink-500">
          Bem-vindo(a), <span className="font-bold text-ink-800">{completedName}</span>. Vamos Ã s
          compras!
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-10">
      <header className="text-center">
        <h1 className="text-2xl font-extrabold text-ink-900">Criar conta</h1>
        <p className="mt-1 text-sm text-ink-500">Comece a comprar fresquinho hoje</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {errors.root?.message && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errors.root.message}
          </p>
        )}

        <Input
          label="Nome completo"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Telefone (opcional)"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          hint="Apenas nÃºmeros com DDD"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <div className="flex flex-col gap-2">
          <Input
            label="Senha"
            type="password"
            autoComplete="new-password"
            hint="MÃ­nimo de 8 caracteres"
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordStrengthMeter password={password} />
        </div>
        <Input
          label="Confirmar senha"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" size="lg" loading={isSubmitting} className="mt-1">
          Criar minha conta
        </Button>
      </form>

      <p className="text-center text-sm text-ink-500">
        JÃ¡ tem conta?{' '}
        <Link
          href={`/login${redirectTo !== '/' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
          className="font-semibold text-accent-600 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}

