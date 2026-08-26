'use client';

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { formatNumber } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { PageSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { friendlyMessage } from '@/lib/errors';
import { AlertTriangle } from 'lucide-react';

type InventoryItem = {
  id: string;
  quantity: number;
  reservedQuantity: number;
  minimumStock: number;
  product: { id: string; name: string; sku: string; unit: string };
};

export default function InventoryPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.inventory,
    queryFn: async () => {
      const env = await apiRequest<{ inventory: InventoryItem[] }>('/admin/inventory');
      return env.data?.inventory ?? [];
    },
  });

  const { data: lowStock } = useQuery({
    queryKey: queryKeys.lowStock,
    queryFn: async () => {
      const env = await apiRequest<{ inventory: InventoryItem[] }>('/admin/inventory/low-stock');
      return env.data?.inventory ?? [];
    },
  });

  const items = data ?? [];
  const lowItems = lowStock ?? [];
  const lowIds = new Set(lowItems.map((i) => i.id));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Estoque" description={`${items.length} itens`} />

      {lowItems.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <div className="flex items-center gap-3 px-5 py-4">
            <AlertTriangle size={20} className="text-yellow-600" />
            <p className="text-sm font-medium text-yellow-700">{lowItems.length} produto(s) com estoque baixo</p>
          </div>
        </Card>
      )}

      {isLoading && <PageSkeleton rows={8} />}
      {isError && <EmptyState message={friendlyMessage(error)} onRetry={refetch} />}
      {!isLoading && !isError && items.length === 0 && <EmptyState message="Nenhum item de estoque" />}

      {!isLoading && !isError && items.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-left text-xs font-medium uppercase text-ink-400">
                  <th className="px-5 py-3">Produto</th>
                  <th className="px-5 py-3">SKU</th>
                  <th className="px-5 py-3 text-center">Disponível</th>
                  <th className="px-5 py-3 text-center">Reservado</th>
                  <th className="px-5 py-3 text-center">Mínimo</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const available = item.quantity - item.reservedQuantity;
                  const isLow = lowIds.has(item.id);
                  return (
                    <tr key={item.id} className={`border-b border-cream-100 last:border-0 ${isLow ? 'bg-yellow-50/50' : ''}`}>
                      <td className="px-5 py-3 font-medium text-ink-800">{item.product?.name}</td>
                      <td className="px-5 py-3 text-ink-500">{item.product?.sku}</td>
                      <td className="px-5 py-3 text-center font-medium text-ink-800">
                        {formatNumber(available)} {item.product?.unit}
                      </td>
                      <td className="px-5 py-3 text-center text-ink-500">{formatNumber(item.reservedQuantity)}</td>
                      <td className="px-5 py-3 text-center text-ink-500">{formatNumber(item.minimumStock)}</td>
                      <td className="px-5 py-3 text-center">
                        <Badge tone={isLow ? 'red' : 'leaf'}>{isLow ? 'Baixo' : 'OK'}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
