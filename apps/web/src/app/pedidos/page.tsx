'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, PackageOpen, RotateCcw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api-client';
import { friendlyMessage } from '@/lib/errors';
import { formatDate, formatPrice } from '@/lib/format';
import { useSessionStore } from '@/stores/session';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Aguardando pagamento',
  PAYMENT_APPROVED: 'Pago',
  PREPARING: 'Em preparo',
  OUT_FOR_DELIVERY: 'Em rota',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

interface OrderSummaryView {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  itemCount: number;
  createdAt: string;
}

export default function PedidosPage() {
  const router = useRouter();
  const user = useSessionStore((state) => state.user);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(useSessionStore.persist.hasHydrated());
    return useSessionStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated && !user) router.replace('/login?redirect=%2Fpedidos');
  }, [hydrated, user, router]);

  const ordersQuery = useQuery({
    queryKey: ['orders'],
    enabled: Boolean(hydrated && user),
    refetchOnMount: 'always',
    retry: 1,
    queryFn: async () => {
      const envelope = await apiRequest<OrderSummaryView[]>('/orders');
      return envelope.data;
    },
  });

  if (!hydrated || !user || (ordersQuery.isPending && !ordersQuery.isError)) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-3 py-8" aria-busy="true">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-20 w-full rounded-card" />
        <Skeleton className="h-20 w-full rounded-card" />
      </div>
    );
  }

  if (ordersQuery.isError) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 py-16 text-center">
        <span aria-hidden className="text-5xl">
          🥀
        </span>
        <h1 className="text-xl font-bold text-ink-900">Não foi possível carregar os pedidos</h1>
        <p role="alert" className="max-w-xs text-sm text-ink-500">
          {friendlyMessage(ordersQuery.error)}
        </p>
        <button
          type="button"
          onClick={() => void ordersQuery.refetch()}
          className="mt-1 inline-flex h-11 items-center gap-2 rounded-pill bg-accent-500 px-6 text-sm font-bold text-white hover:bg-accent-600"
        >
          <RotateCcw size={16} aria-hidden />
          Tentar novamente
        </button>
      </div>
    );
  }

  const orders = ordersQuery.data ?? [];

  if (orders.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 py-16 text-center">
        <PackageOpen size={48} aria-hidden className="text-ink-400" />
        <h1 className="text-xl font-bold text-ink-900">Nenhum pedido ainda</h1>
        <p className="max-w-xs text-sm text-ink-500">
          Suas compras aparecerão aqui. Que tal começar pelas ofertas de hoje?
        </p>
        <Link
          href="/"
          className="mt-2 inline-flex h-11 items-center rounded-pill bg-accent-500 px-6 text-sm font-bold text-white hover:bg-accent-600"
        >
          Ver produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-extrabold text-ink-900">Meus pedidos</h1>
        <span className="text-xs text-ink-400">
          {orders.length === 1 ? '1 pedido' : `${orders.length} pedidos`}
        </span>
      </header>

      <ul className="flex flex-col gap-2.5">
        {orders.map((order, index) => {
          const cancelled = order.status === 'CANCELLED';
          const done = order.status === 'DELIVERED';
          return (
            <motion.li
              key={order.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.04, 0.3) }}
            >
              <Link
                href="/pedidos"
                className="flex items-center gap-3 rounded-card border border-cream-200 bg-white p-4 shadow-card transition-colors hover:border-accent-200"
              >
                <span
                  aria-hidden
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
                    cancelled ? 'bg-red-50' : done ? 'bg-cream-100' : 'bg-leaf-50'
                  }`}
                >
                  {cancelled ? '🥀' : done ? '✅' : '🧺'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-ink-900">{order.orderNumber}</span>
                  <span className="block text-xs text-ink-400">
                    {formatDate(order.createdAt)} · {order.itemCount}{' '}
                    {order.itemCount === 1 ? 'item' : 'itens'}
                  </span>
                  <span
                    className={`mt-0.5 inline-block rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      cancelled
                        ? 'bg-red-50 text-red-600'
                        : done
                          ? 'bg-cream-100 text-ink-500'
                          : 'bg-accent-50 text-accent-700'
                    }`}
                  >
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-extrabold text-accent-600">
                  {formatPrice(order.total)}
                </span>
                <ChevronRight size={16} aria-hidden className="shrink-0 text-ink-400" />
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
