'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiRequest } from '@/lib/api-client';
import { queryKeys } from '@/lib/admin/query-keys';
import { formatPrice, formatNumber, formatDate } from '@/lib/format';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/admin/constants';
import { Card, CardContent, CardHeader } from '@/components/admin/ui/card';
import { PageHeader } from '@/components/admin/ui/page-header';
import { PageSkeleton } from '@/components/admin/ui/skeleton';
import { EmptyState } from '@/components/admin/ui/empty-state';
import { Badge } from '@/components/admin/ui/badge';
import { Button } from '@/components/admin/ui/button';
import { friendlyMessage } from '@/lib/errors';
import { DashboardTrendChart } from '@/components/admin/dashboard-trend-chart';
import {
  ShoppingCart,
  DollarSign,
  Clock,
  AlertTriangle,
  Package,
  Users,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';

type DashboardData = {
  ordersToday: number;
  salesToday: number;
  pendingOrders: number;
  lowStockProducts: number;
  activeProducts: number;
  customers: number;
};

type RecentOrder = {
  id: string;
  orderNumber: string;
  customer: string;
  total: number;
  status: string;
  createdAt: string;
};

const KPI_CARDS = [
  { key: 'ordersToday' as const, label: 'Pedidos hoje', icon: ShoppingCart, color: 'text-accent-500' },
  { key: 'salesToday' as const, label: 'Vendas hoje', icon: DollarSign, color: 'text-leaf-600', isPrice: true },
  { key: 'pendingOrders' as const, label: 'Pedidos pendentes', icon: Clock, color: 'text-yellow-600' },
  { key: 'lowStockProducts' as const, label: 'Estoque baixo', icon: AlertTriangle, color: 'text-red-500' },
  { key: 'activeProducts' as const, label: 'Produtos ativos', icon: Package, color: 'text-blue-600' },
  { key: 'customers' as const, label: 'Clientes', icon: Users, color: 'text-ink-600' },
];

const DAYS_OPTIONS = [7, 30, 90];

export default function DashboardPage() {
  const [days, setDays] = useState(30);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const env = await apiRequest<DashboardData>('/admin/dashboard');
      return env.data!;
    },
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: queryKeys.dashboardTrends(days),
    queryFn: async () => {
      const env = await apiRequest<Array<{ date: string; orders: number; revenue: number }>>('/admin/dashboard/trends', {
        query: { days },
      });
      return env.data ?? [];
    },
  });

  const { data: recentOrders, isLoading: recentLoading } = useQuery({
    queryKey: queryKeys.dashboardRecentOrders(8),
    queryFn: async () => {
      const env = await apiRequest<RecentOrder[]>('/admin/dashboard/recent-orders', { query: { limit: 8 } });
      return env.data ?? [];
    },
  });

  if (isLoading) return <PageSkeleton rows={4} />;

  if (isError) return <EmptyState message={friendlyMessage(error)} onRetry={refetch} />;

  if (!data) return <EmptyState message="Sem dados disponíveis" />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" description="Visão geral do negócio" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {KPI_CARDS.map(({ key, label, icon: Icon, color, isPrice }) => (
          <Card key={key}>
            <CardContent className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-cream-100 ${color}`}>
                <Icon size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-ink-900">{isPrice ? formatPrice(data[key]) : formatNumber(data[key])}</p>
                <p className="text-sm text-ink-400">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-accent-500" />
            <h2 className="text-sm font-semibold text-ink-800">Vendas e pedidos</h2>
          </div>
          <div className="flex gap-1">
            {DAYS_OPTIONS.map((option) => (
              <Button
                key={option}
                size="sm"
                variant={days === option ? 'primary' : 'outline'}
                onClick={() => setDays(option)}
              >
                {option}d
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="h-72">
          {trendsLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-ink-400" aria-busy="true">
              Carregando gráfico...
            </div>
          ) : (
            <DashboardTrendChart data={trends ?? []} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-800">Últimos pedidos</h2>
          <Link href="/admin/pedidos">
            <Button variant="ghost" size="sm">
              Ver todos
              <ArrowUpRight size={14} />
            </Button>
          </Link>
        </CardHeader>
        {recentLoading ? (
          <CardContent>
            <div className="flex flex-col gap-2" aria-busy="true">
              <div className="h-10 animate-pulse rounded-xl bg-cream-100" />
              <div className="h-10 animate-pulse rounded-xl bg-cream-100" />
              <div className="h-10 animate-pulse rounded-xl bg-cream-100" />
            </div>
          </CardContent>
        ) : recentOrders && recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-left text-xs font-medium uppercase text-ink-400">
                  <th className="px-5 py-3">Pedido</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3">Data</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="border-b border-cream-100 last:border-0">
                    <td className="px-5 py-3">
                      <Link href={`/admin/pedidos/${o.id}`} className="font-mono text-xs font-medium text-accent-600 hover:underline">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-ink-700">{o.customer}</td>
                    <td className="px-5 py-3 text-right font-medium text-ink-800">{formatPrice(o.total)}</td>
                    <td className="px-5 py-3 text-center">
                      <Badge className={ORDER_STATUS_COLORS[o.status]}>{ORDER_STATUS_LABELS[o.status] ?? o.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-ink-400">{formatDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <CardContent>
            <EmptyState message="Nenhum pedido ainda" />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
