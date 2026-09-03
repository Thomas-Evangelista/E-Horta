'use client';

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { queryKeys } from '@/lib/admin/query-keys';
import { formatPrice, formatNumber } from '@/lib/format';
import { Card, CardContent } from '@/components/admin/ui/card';
import { PageHeader } from '@/components/admin/ui/page-header';
import { PageSkeleton } from '@/components/admin/ui/skeleton';
import { EmptyState } from '@/components/admin/ui/empty-state';
import { friendlyMessage } from '@/lib/errors';
import { ShoppingCart, DollarSign, Clock, AlertTriangle, Package, Users } from 'lucide-react';

type DashboardData = {
  ordersToday: number;
  salesToday: number;
  pendingOrders: number;
  lowStockProducts: number;
  activeProducts: number;
  customers: number;
};

const KPI_CARDS = [
  { key: 'ordersToday' as const, label: 'Pedidos hoje', icon: ShoppingCart, color: 'text-accent-500' },
  { key: 'salesToday' as const, label: 'Vendas hoje', icon: DollarSign, color: 'text-leaf-600', isPrice: true },
  { key: 'pendingOrders' as const, label: 'Pedidos pendentes', icon: Clock, color: 'text-yellow-600' },
  { key: 'lowStockProducts' as const, label: 'Estoque baixo', icon: AlertTriangle, color: 'text-red-500' },
  { key: 'activeProducts' as const, label: 'Produtos ativos', icon: Package, color: 'text-blue-600' },
  { key: 'customers' as const, label: 'Clientes', icon: Users, color: 'text-ink-600' },
];

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const env = await apiRequest<DashboardData>('/admin/dashboard');
      return env.data!;
    },
  });

  if (isLoading) return <PageSkeleton rows={3} />;

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
    </div>
  );
}
