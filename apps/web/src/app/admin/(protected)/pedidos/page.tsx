'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { queryKeys } from '@/lib/admin/query-keys';
import { formatPrice, formatDateTime } from '@/lib/format';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/admin/constants';
import { Card } from '@/components/admin/ui/card';
import { PageHeader } from '@/components/admin/ui/page-header';
import { PageSkeleton } from '@/components/admin/ui/skeleton';
import { EmptyState } from '@/components/admin/ui/empty-state';
import { Badge } from '@/components/admin/ui/badge';
import { Button } from '@/components/admin/ui/button';
import { Select } from '@/components/admin/ui/select';
import { Pagination } from '@/components/admin/ui/pagination';
import { friendlyMessage } from '@/lib/errors';
import { Search, Eye } from 'lucide-react';
import Link from 'next/link';

type Order = {
  id: string; total: number; status: string; createdAt: string;
  user: { name: string; email: string };
  items: { quantity: number }[];
};

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.orders({ page, status: statusFilter, search }),
    queryFn: async () => {
      const env = await apiRequest<{ orders: Order[] }>('/admin/orders', {
        query: { page, limit: 15, status: statusFilter || undefined, search: search || undefined },
      });
      return env;
    },
  });

  const orders = data?.data?.orders ?? [];
  const meta = data?.meta;

  const statusOptions = Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Pedidos" description={`${meta?.total ?? 0} pedidos`} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Buscar por cliente..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
            className="h-10 w-full rounded-xl border border-cream-300 bg-white pl-9 pr-3 text-sm text-ink-800 placeholder:text-ink-400"
          />
        </div>
        <Select
          label=""
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          options={statusOptions}
          placeholder="Todos os status"
          className="!h-10 w-auto"
        />
      </div>

      {isLoading && <PageSkeleton rows={8} />}
      {isError && <EmptyState message={friendlyMessage(error)} onRetry={refetch} />}
      {!isLoading && !isError && orders.length === 0 && <EmptyState message="Nenhum pedido encontrado" />}

      {!isLoading && !isError && orders.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-left text-xs font-medium uppercase text-ink-400">
                  <th className="px-5 py-3">Pedido</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3 text-center">Itens</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-cream-100 last:border-0">
                    <td className="px-5 py-3 font-mono text-xs text-ink-500">{o.id.slice(0, 8)}...</td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink-800">{o.user?.name}</p>
                      <p className="text-xs text-ink-400">{o.user?.email}</p>
                    </td>
                    <td className="px-5 py-3 text-center text-ink-500">{o.items?.length ?? 0}</td>
                    <td className="px-5 py-3 text-right font-medium text-ink-800">{formatPrice(o.total)}</td>
                    <td className="px-5 py-3 text-center">
                      <Badge className={ORDER_STATUS_COLORS[o.status]}>{ORDER_STATUS_LABELS[o.status] ?? o.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-ink-400">{formatDateTime(o.createdAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/admin/pedidos/${o.id}`}>
                        <Button variant="ghost" size="icon"><Eye size={16} /></Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta && <Pagination page={meta.page ?? 1} totalPages={meta.totalPages ?? 1} onPageChange={setPage} />}
        </Card>
      )}
    </div>
  );
}
