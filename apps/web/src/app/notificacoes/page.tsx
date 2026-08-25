'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BellOff, CheckCheck, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/feedback/toast';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/use-notifications';
import { friendlyMessage } from '@/lib/errors';
import { formatRelativeTime } from '@/lib/format';
import { useSessionStore } from '@/stores/session';

export default function NotificacoesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const user = useSessionStore((state) => state.user);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(useSessionStore.persist.hasHydrated());
    return useSessionStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated && !user) router.replace('/login?redirect=%2Fnotificacoes');
  }, [hydrated, user, router]);

  const notificationsQuery = useNotifications(hydrated && Boolean(user));
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  async function handleMarkAll() {
    try {
      await markAllRead.mutateAsync();
    } catch (error) {
      toast('error', friendlyMessage(error));
    }
  }

  function handleNotificationClick(id: string, read: boolean) {
    if (!read && !markRead.isPending) {
      markRead.mutate(id, {
        onError: () => toast('error', 'Não foi possível marcar como lida.'),
      });
    }
  }

  if (!hydrated || !user || (notificationsQuery.isPending && !notificationsQuery.isError)) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-3 py-8" aria-busy="true">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-16 w-full rounded-card" />
        <Skeleton className="h-16 w-full rounded-card" />
        <Skeleton className="h-16 w-full rounded-card" />
      </div>
    );
  }

  if (notificationsQuery.isError) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 py-16 text-center">
        <span aria-hidden className="text-5xl">
          🥀
        </span>
        <h1 className="text-xl font-bold text-ink-900">Não foi possível carregar as notificações</h1>
        <p role="alert" className="max-w-xs text-sm text-ink-500">
          {friendlyMessage(notificationsQuery.error)}
        </p>
        <Button onClick={() => void notificationsQuery.refetch()}>
          <RotateCcw size={16} aria-hidden />
          Tentar novamente
        </Button>
      </div>
    );
  }

  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-extrabold text-ink-900">Notificações</h1>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void handleMarkAll()}
            disabled={markAllRead.isPending}
            className="inline-flex items-center gap-1 text-xs font-bold text-accent-600 hover:underline disabled:opacity-50"
          >
            <CheckCheck size={14} aria-hidden />
            Marcar todas como lidas
          </button>
        )}
      </header>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <BellOff size={44} aria-hidden className="text-ink-400" />
          <h2 className="text-lg font-bold text-ink-900">Nada por aqui</h2>
          <p className="max-w-xs text-sm text-ink-500">
            Avisos sobre seus pedidos e novidades aparecerão aqui.
          </p>
          <Link
            href="/"
            className="mt-1 inline-flex h-11 items-center rounded-pill bg-accent-500 px-6 text-sm font-bold text-white hover:bg-accent-600"
          >
            Ver produtos
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {notifications.map((notification, index) => (
            <motion.li
              key={notification.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.04, 0.3) }}
            >
              <button
                type="button"
                onClick={() => handleNotificationClick(notification.id, notification.read)}
                aria-label={
                  notification.read
                    ? notification.title
                    : `${notification.title}. Marcar como lida`
                }
                className={`w-full rounded-card border p-4 text-left transition-colors ${
                  notification.read
                    ? 'border-cream-200 bg-white'
                    : 'border-accent-200 bg-accent-50/60 hover:border-accent-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`text-sm ${notification.read ? 'font-semibold text-ink-700' : 'font-bold text-ink-900'}`}
                  >
                    {notification.title}
                  </span>
                  {!notification.read && (
                    <span
                      aria-hidden
                      className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent-500"
                    />
                  )}
                </div>
                <p className="mt-0.5 text-sm text-ink-600">{notification.message}</p>
                <time dateTime={notification.createdAt} className="mt-1 block text-xs text-ink-400">
                  {formatRelativeTime(notification.createdAt)}
                </time>
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
