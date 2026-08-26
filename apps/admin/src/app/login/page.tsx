'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest, setAccessToken } from '@/lib/api-client';
import { useSessionStore } from '@/stores/session';
import { useToast } from '@/components/feedback/toast';
import { friendlyMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Leaf } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const setSession = useSessionStore((s) => s.setSession);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginForm) {
    setLoading(true);
    try {
      const env = await apiRequest<{ user: { id: string; name: string; email: string; role: string }; accessToken: string; refreshToken: string }>(
        '/auth/login',
        { body: data },
      );
      if (env.data) {
        const { user, accessToken, refreshToken } = env.data;
        if (user.role !== 'ADMIN') {
          toast('error', 'Acesso restrito a administradores');
          setLoading(false);
          return;
        }
        setSession(user, accessToken, refreshToken);
        setAccessToken(accessToken);
        router.replace('/');
      }
    } catch (err) {
      toast('error', friendlyMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-leaf-600 text-white">
            <Leaf size={28} />
          </div>
          <h1 className="text-xl font-bold text-ink-900">E-Horta Admin</h1>
          <p className="text-sm text-ink-400">Painel administrativo</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="admin@ehorta.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Senha"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" loading={loading} className="mt-2">
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
