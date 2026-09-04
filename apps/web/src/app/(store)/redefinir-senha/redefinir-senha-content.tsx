'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordStrengthMeter } from '@/components/ui/password-strength-meter';
import { useToast } from '@/components/feedback/toast';
import { applyApiFieldErrors } from '@/lib/form-errors';
import { friendlyMessage } from '@/lib/errors';
import { apiRequest } from '@/lib/api-client';

const redefinirSenhaFormSchema = z
  .object({
    password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres').max(128),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  });

type RedefinirSenhaFormValues = z.infer<typeof redefinirSenhaFormSchema>;

export function RedefinirSenhaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { toast } = useToast();
  const [completed, setCompleted] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RedefinirSenhaFormValues>({ resolver: zodResolver(redefinirSenhaFormSchema) });

  const password = watch('password') ?? '';

  useEffect(() => {
    if (!completed) return;
    const timer = window.setTimeout(() => {
      router.push('/login');
      router.refresh();
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [completed, router]);

  async function onSubmit(values: RedefinirSenhaFormValues) {
    if (!token) {
      toast('error', 'Link inválido. Solicite um novo link de redefinição.');
      return;
    }
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: {
          token,
          password: values.password,
          confirmPassword: values.confirmPassword,
        },
      });
      setCompleted(true);
    } catch (error) {
      const handled = applyApiFieldErrors(error, (field, fieldError) =>
        setError(field as keyof RedefinirSenhaFormValues, fieldError),
      );
      if (!handled) {
        toast('error', friendlyMessage(error));
      }
    }
  }

  if (completed) {
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
        <h1 className="text-xl font-extrabold text-ink-900">Senha redefinida!</h1>
        <p className="text-sm text-ink-500">Faça login com sua nova senha.</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col gap-4 py-20 text-center">
        <h1 className="text-xl font-extrabold text-ink-900">Link inválido</h1>
        <p className="text-sm text-ink-500">O link de redefinição está incompleto ou expirou.</p>
        <Link href="/esqueci-senha" className="font-semibold text-accent-600 hover:underline">
          Solicitar novo link
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-10">
      <header className="text-center">
        <h1 className="text-2xl font-extrabold text-ink-900">Redefinir senha</h1>
        <p className="mt-1 text-sm text-ink-500">Crie uma nova senha para sua conta</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Input
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            hint="Mínimo de 8 caracteres"
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordStrengthMeter password={password} />
        </div>
        <Input
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" size="lg" loading={isSubmitting} className="mt-1">
          Redefinir senha
        </Button>
      </form>

      <p className="text-center text-sm text-ink-500">
        Já tem a senha?{' '}
        <Link href="/login" className="font-semibold text-accent-600 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
