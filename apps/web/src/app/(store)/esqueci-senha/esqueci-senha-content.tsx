'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/feedback/toast';
import { applyApiFieldErrors } from '@/lib/form-errors';
import { friendlyMessage } from '@/lib/errors';
import { apiRequest } from '@/lib/api-client';

const esqueciSenhaFormSchema = z.object({
  email: z.string().email('Informe um e-mail válido'),
});

type EsqueciSenhaFormValues = z.infer<typeof esqueciSenhaFormSchema>;

export function EsqueciSenhaContent() {
  const { toast } = useToast();
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EsqueciSenhaFormValues>({ resolver: zodResolver(esqueciSenhaFormSchema) });

  async function onSubmit(values: EsqueciSenhaFormValues) {
    try {
      await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: { email: values.email },
      });
      setSent(true);
    } catch (error) {
      const handled = applyApiFieldErrors(error, (field, fieldError) =>
        setError(field as keyof EsqueciSenhaFormValues, fieldError),
      );
      if (!handled) {
        toast('error', friendlyMessage(error));
      }
    }
  }

  if (sent) {
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
        <h1 className="text-xl font-extrabold text-ink-900">Verifique seu e-mail</h1>
        <p className="text-sm text-ink-500">
          Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.
        </p>
        <Link href="/login" className="font-semibold text-accent-600 hover:underline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-10">
      <header className="text-center">
        <h1 className="text-2xl font-extrabold text-ink-900">Esqueci minha senha</h1>
        <p className="mt-1 text-sm text-ink-500">
          Informe seu e-mail e enviaremos um link para redefinir a senha
        </p>
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
        <Button type="submit" size="lg" loading={isSubmitting} className="mt-1">
          Enviar link
        </Button>
      </form>

      <p className="text-center text-sm text-ink-500">
        Lembrou a senha?{' '}
        <Link href="/login" className="font-semibold text-accent-600 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
