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
import { useToast } from '@/components/feedback/toast';
import { getStoredCartToken, clearStoredCartToken } from '@/lib/cart-token';
import { applyApiFieldErrors } from '@/lib/form-errors';
import { friendlyMessage } from '@/lib/errors';
import { loginRequest, useSessionStore } from '@/stores/session';

const loginFormSchema = z.object({
  email: z.string().email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe sua senha'),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/';
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const setSession = useSessionStore((state) => state.setSession);
  const [completedFirstName, setCompletedFirstName] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema) });

  useEffect(() => {
    if (!completedFirstName) return;
    const timer = window.setTimeout(() => {
      router.push(redirectTo);
      router.refresh();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [completedFirstName, redirectTo, router]);

  async function onSubmit(values: LoginFormValues) {
    try {
      const cartToken = getStoredCartToken() ?? undefined;
      const { user, tokens } = await loginRequest({ ...values, cartToken });
      setSession(user, tokens);
      clearStoredCartToken();
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
      setCompletedFirstName(user.name.split(' ')[0]);
    } catch (error) {
      const handled = applyApiFieldErrors(error, (field, fieldError) =>
        setError(field as keyof LoginFormValues, fieldError),
      );
      if (!handled) {
        toast('error', friendlyMessage(error));
      }
    }
  }

  if (completedFirstName) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 py-20 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          aria-hidden
          className="flex h-16 w-16 items-center justify-center rounded-full bg-leaf-600 text-3xl text-white"
        >
          ✓
        </motion.div>
        <h1 className="text-xl font-extrabold text-ink-900">Login realizado!</h1>
        <p className="text-sm text-ink-500">
          Bem-vindo de volta, <span className="font-bold text-ink-800">{completedFirstName}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-10">
      <header className="text-center">
        <h1 className="text-2xl font-extrabold text-ink-900">Entrar</h1>
        <p className="mt-1 text-sm text-ink-500">Acesse sua conta E-Horta</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Senha"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="-mt-1 text-right">
          <Link
            href="/esqueci-senha"
            className="text-xs font-medium text-accent-600 hover:underline"
          >
            Esqueci minha senha?
          </Link>
        </div>
        <Button type="submit" size="lg" loading={isSubmitting} className="mt-1">
          Entrar
        </Button>
      </form>

      <div className="flex flex-col items-center gap-1.5 text-sm text-ink-500">
        <p>
          Ainda não tem conta?{' '}
          <Link
            href={`/cadastro${redirectTo !== '/' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
            className="font-semibold text-accent-600 hover:underline"
          >
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
