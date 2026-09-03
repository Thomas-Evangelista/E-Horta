'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { queryKeys } from '@/lib/admin/query-keys';
import { formatPrice, formatDateTime } from '@/lib/format';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_TRANSITIONS } from '@/lib/admin/constants';
import { Card, CardContent, CardHeader } from '@/components/admin/ui/card';
import { PageHeader } from '@/components/admin/ui/page-header';
import { FullPageSpinner } from '@/components/admin/ui/skeleton';
import { EmptyState } from '@/components/admin/ui/empty-state';
import { Badge } from '@/components/admin/ui/badge';
import { Button } from '@/components/admin/ui/button';
import { Select } from '@/components/admin/ui/select';
import { Input } from '@/components/admin/ui/input';
import { useToast } from '@/components/admin/feedback/toast';
import { friendlyMessage } from '@/lib/errors';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

type OrderDetail = {
  id: string; total: number; status: string; createdAt: string; notes?: string;
  user: { id: string; name: string; email: string };
  items: { id: string; name: string; quantity: number; unitPrice: number; total: number }[];
  address?: { street: string; number: string; neighborhood: string; city: string; state: string; zipCode: string };
  payment?: { method: string; status: string };
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');

  const { data: order, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.orderDetail(id),
    queryFn: async () => {
      const env = await apiRequest<OrderDetail>(`/admin/orders/${id}`);
      return env.data!;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async () => {
      if (!newStatus) return;
      return apiRequest(`/admin/orders/${id}/status`, {
        method: 'PATCH',
        body: { status: newStatus, reason: reason || undefined },
      });
    },
    onSuccess: () => {
      toast('success', 'Status atualizado!');
      void qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      void qc.invalidateQueries({ queryKey: queryKeys.orderDetail(id) });
      setNewStatus('');
      setReason('');
    },
    onError: (err) => toast('error', friendlyMessage(err)),
  });

  if (isLoading) return <FullPageSpinner />;
  if (isError) return <EmptyState message={friendlyMessage(error)} onRetry={refetch} />;
  if (!order) return <EmptyState message="Pedido não encontrado" />;

  const allowedTransitions = ORDER_TRANSITIONS[order.status] ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Pedido #${order.id.slice(0, 8)}`}
        actions={
          <Link href="/admin/pedidos">
            <Button variant="ghost" size="sm"><ArrowLeft size={16} /> Voltar</Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader><h2 className="text-sm font-bold text-ink-800">Itens</h2></CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b border-cream-100 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-ink-800">{item.name}</p>
                      <p className="text-xs text-ink-400">{item.quantity}x {formatPrice(item.unitPrice)}</p>
                    </div>
                    <p className="font-medium text-ink-800">{formatPrice(item.total)}</p>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-cream-200 pt-3">
                  <p className="font-bold text-ink-900">Total</p>
                  <p className="font-bold text-ink-900">{formatPrice(order.total)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {order.address && (
            <Card>
              <CardHeader><h2 className="text-sm font-bold text-ink-800">Endereço de entrega</h2></CardHeader>
              <CardContent>
                <p className="text-sm text-ink-600">
                  {order.address.street}, {order.address.number} — {order.address.neighborhood}<br />
                  {order.address.city}/{order.address.state} — CEP {order.address.zipCode}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader><h2 className="text-sm font-bold text-ink-800">Cliente</h2></CardHeader>
            <CardContent>
              <p className="font-medium text-ink-800">{order.user?.name}</p>
              <p className="text-sm text-ink-400">{order.user?.email}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="text-sm font-bold text-ink-800">Status</h2></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Badge className={ORDER_STATUS_COLORS[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
              <p className="text-xs text-ink-400">{formatDateTime(order.createdAt)}</p>

              {allowedTransitions.length > 0 && (
                <div className="flex flex-col gap-2 pt-2">
                  <Select
                    label="Novo status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    options={allowedTransitions.map((s) => ({ value: s, label: ORDER_STATUS_LABELS[s] ?? s }))}
                    placeholder="Selecionar..."
                  />
                  <Input
                    label="Motivo (opcional)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Motivo da alteração"
                  />
                  <Button
                    size="sm"
                    disabled={!newStatus}
                    loading={statusMutation.isPending}
                    onClick={() => statusMutation.mutate()}
                  >
                    Atualizar status
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {order.payment && (
            <Card>
              <CardHeader><h2 className="text-sm font-bold text-ink-800">Pagamento</h2></CardHeader>
              <CardContent>
                <p className="text-sm text-ink-600">Método: <span className="font-medium">{order.payment.method}</span></p>
                <Badge className={order.payment.status === 'APPROVED' ? 'bg-leaf-100 text-leaf-700' : 'bg-yellow-100 text-yellow-600'}>
                  {order.payment.status}
                </Badge>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
