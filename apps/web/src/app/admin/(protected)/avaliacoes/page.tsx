'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { queryKeys } from '@/lib/admin/query-keys';
import { formatDateTime } from '@/lib/format';
import { REVIEW_STATUS_LABELS } from '@/lib/admin/constants';
import { Card } from '@/components/admin/ui/card';
import { PageHeader } from '@/components/admin/ui/page-header';
import { PageSkeleton } from '@/components/admin/ui/skeleton';
import { EmptyState } from '@/components/admin/ui/empty-state';
import { Badge } from '@/components/admin/ui/badge';
import { Button } from '@/components/admin/ui/button';
import { Select } from '@/components/admin/ui/select';
import { Pagination } from '@/components/admin/ui/pagination';
import { useToast } from '@/components/admin/feedback/toast';
import { friendlyMessage } from '@/lib/errors';
import { Check, X, Star } from 'lucide-react';

type Review = {
  id: string; rating: number; comment?: string; status: string; createdAt: string;
  user: { name: string };
  product: { name: string };
};

export default function ReviewsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('PENDING');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.reviews({ page, status: statusFilter }),
    queryFn: async () => {
      const env = await apiRequest<{ reviews: Review[] }>('/admin/reviews', {
        query: { page, limit: 15, status: statusFilter || undefined },
      });
      return env;
    },
  });

  const moderateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) => {
      return apiRequest(`/admin/reviews/${id}/status`, { method: 'PATCH', body: { status } });
    },
    onSuccess: () => {
      toast('success', 'Avaliação moderada!');
      void qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
    onError: (err) => toast('error', friendlyMessage(err)),
  });

  const reviews = data?.data?.reviews ?? [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Avaliações" description="Moderação de avaliações" />

      <div className="flex gap-3">
        <Select
          label=""
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          options={[
            { value: 'PENDING', label: 'Pendentes' },
            { value: 'APPROVED', label: 'Aprovadas' },
            { value: 'REJECTED', label: 'Rejeitadas' },
          ]}
          className="!h-10 w-auto"
        />
      </div>

      {isLoading && <PageSkeleton rows={5} />}
      {isError && <EmptyState message={friendlyMessage(error)} onRetry={refetch} />}
      {!isLoading && !isError && reviews.length === 0 && <EmptyState message="Nenhuma avaliação" />}

      {!isLoading && !isError && reviews.length > 0 && (
        <div className="flex flex-col gap-3">
          {reviews.map((r) => (
            <Card key={r.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink-800">{r.user?.name}</p>
                    <Badge tone={r.status === 'PENDING' ? 'yellow' : r.status === 'APPROVED' ? 'leaf' : 'red'}>
                      {REVIEW_STATUS_LABELS[r.status]}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-400">Produto: {r.product?.name} · {formatDateTime(r.createdAt)}</p>
                </div>
                <div className="flex items-center gap-0.5 text-accent-500">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={14} fill={i < r.rating ? 'currentColor' : 'none'} />
                  ))}
                </div>
              </div>
              {r.comment && <p className="text-sm text-ink-600">{r.comment}</p>}
              {r.status === 'PENDING' && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="secondary" loading={moderateMutation.isPending} onClick={() => moderateMutation.mutate({ id: r.id, status: 'APPROVED' })}>
                    <Check size={14} /> Aprovar
                  </Button>
                  <Button size="sm" variant="danger" loading={moderateMutation.isPending} onClick={() => moderateMutation.mutate({ id: r.id, status: 'REJECTED' })}>
                    <X size={14} /> Rejeitar
                  </Button>
                </div>
              )}
            </Card>
          ))}
          {meta && <Pagination page={meta.page ?? 1} totalPages={meta.totalPages ?? 1} onPageChange={setPage} />}
        </div>
      )}
    </div>
  );
}
