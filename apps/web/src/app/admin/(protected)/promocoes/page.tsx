'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { queryKeys } from '@/lib/admin/query-keys';
import { formatPrice, formatDate } from '@/lib/format';
import { PROMOTION_TYPE_LABELS } from '@/lib/admin/constants';
import { Card } from '@/components/admin/ui/card';
import { PageHeader } from '@/components/admin/ui/page-header';
import { PageSkeleton } from '@/components/admin/ui/skeleton';
import { EmptyState } from '@/components/admin/ui/empty-state';
import { Badge } from '@/components/admin/ui/badge';
import { Button } from '@/components/admin/ui/button';
import { Input } from '@/components/admin/ui/input';
import { Select } from '@/components/admin/ui/select';
import { Modal } from '@/components/admin/ui/modal';
import { Pagination } from '@/components/admin/ui/pagination';
import { useToast } from '@/components/admin/feedback/toast';
import { friendlyMessage } from '@/lib/errors';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const promoSchema = z.object({
  code: z.string().min(3).max(32),
  name: z.string().min(3).max(80),
  type: z.enum(['PERCENTAGE', 'FIXED', 'FREE_SHIPPING']),
  value: z.coerce.number().min(0),
  minimumOrderValue: z.coerce.number().min(0).optional(),
  maxDiscount: z.coerce.number().positive().optional(),
  startsAt: z.string().min(1, 'Obrigatório'),
  endsAt: z.string().min(1, 'Obrigatório'),
  usageLimit: z.coerce.number().min(1).optional(),
}).transform((data) => ({
  ...data,
  code: data.code.toUpperCase(),
}));

type PromoForm = z.input<typeof promoSchema>;
type PromoOutput = z.output<typeof promoSchema>;

type Promotion = {
  id: string; code: string; name: string; type: string; value: number;
  startsAt: string; endsAt: string; isActive: boolean; usageLimit?: number;
  usageCount: number; minimumOrderValue?: number;
};

export default function PromotionsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.promotions({ page }),
    queryFn: async () => {
      const env = await apiRequest<{ promotions: Promotion[] }>('/admin/promotions', { query: { page, limit: 15 } });
      return env;
    },
  });

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<PromoForm>({
    resolver: zodResolver(promoSchema),
    defaultValues: { code: '', name: '', type: 'PERCENTAGE', value: 0 },
  });

  const type = watch('type');

  const createMutation = useMutation({
    mutationFn: async (d: PromoOutput) => apiRequest('/admin/promotions', { body: d }),
    onSuccess: () => { toast('success', 'Promoção criada!'); void qc.invalidateQueries({ queryKey: ['admin', 'promotions'] }); closeModal(); },
    onError: (err: unknown) => toast('error', friendlyMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: async (d: PromoOutput) => apiRequest(`/admin/promotions/${editing?.id}`, { method: 'PATCH', body: d }),
    onSuccess: () => { toast('success', 'Promoção atualizada!'); void qc.invalidateQueries({ queryKey: ['admin', 'promotions'] }); closeModal(); },
    onError: (err: unknown) => toast('error', friendlyMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest(`/admin/promotions/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast('success', 'Promoção removida'); void qc.invalidateQueries({ queryKey: ['admin', 'promotions'] }); },
    onError: (err: unknown) => toast('error', friendlyMessage(err)),
  });

  function openCreate() { setEditing(null); reset({ code: '', name: '', type: 'PERCENTAGE', value: 0, startsAt: '', endsAt: '' }); setModalOpen(true); }
  function openEdit(p: Promotion) { setEditing(p); reset({ code: p.code, name: p.name, type: p.type as PromoForm['type'], value: p.value, minimumOrderValue: p.minimumOrderValue, startsAt: p.startsAt.slice(0, 16), endsAt: p.endsAt.slice(0, 16), usageLimit: p.usageLimit }); setModalOpen(true); }
  function closeModal() { setModalOpen(false); setEditing(null); }

  const promotions = data?.data?.promotions ?? [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Promoções" description={`${meta?.total ?? 0} promoções`} actions={<Button size="sm" onClick={openCreate}><Plus size={16} /> Nova promoção</Button>} />

      {isLoading && <PageSkeleton rows={5} />}
      {isError && <EmptyState message={friendlyMessage(error)} onRetry={refetch} />}
      {!isLoading && !isError && promotions.length === 0 && <EmptyState message="Nenhuma promoção" />}

      {!isLoading && !isError && promotions.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-left text-xs font-medium uppercase text-ink-400">
                  <th className="px-5 py-3">Código</th>
                  <th className="px-5 py-3">Nome</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3 text-right">Valor</th>
                  <th className="px-5 py-3">Período</th>
                  <th className="px-5 py-3 text-center">Uso</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((p) => (
                  <tr key={p.id} className="border-b border-cream-100 last:border-0">
                    <td className="px-5 py-3 font-mono text-xs font-bold text-ink-800">{p.code}</td>
                    <td className="px-5 py-3 text-ink-800">{p.name}</td>
                    <td className="px-5 py-3 text-ink-500">{PROMOTION_TYPE_LABELS[p.type] ?? p.type}</td>
                    <td className="px-5 py-3 text-right font-medium text-ink-800">
                      {p.type === 'PERCENTAGE' ? `${p.value}%` : p.type === 'FIXED' ? formatPrice(p.value) : 'Frete grátis'}
                    </td>
                    <td className="px-5 py-3 text-xs text-ink-400">{formatDate(p.startsAt)} — {formatDate(p.endsAt)}</td>
                    <td className="px-5 py-3 text-center text-ink-500">{p.usageCount}{p.usageLimit ? `/${p.usageLimit}` : ''}</td>
                    <td className="px-5 py-3 text-center"><Badge tone={p.isActive ? 'leaf' : 'red'}>{p.isActive ? 'Ativa' : 'Inativa'}</Badge></td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil size={14} /></Button>
                        <Button variant="ghost" size="icon" className="text-red-600" onClick={() => { if (confirm('Remover?')) deleteMutation.mutate(p.id); }}><Trash2 size={14} /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta && <Pagination page={meta.page ?? 1} totalPages={meta.totalPages ?? 1} onPageChange={setPage} />}
        </Card>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Editar promoção' : 'Nova promoção'} footer={<Button loading={createMutation.isPending || updateMutation.isPending} onClick={handleSubmit((d) => editing ? updateMutation.mutate(d) : createMutation.mutate(d))}>{editing ? 'Salvar' : 'Criar'}</Button>}>
        <form className="flex flex-col gap-4">
          <Input label="Código" placeholder="DESCONTO10" error={errors.code?.message} {...register('code')} />
          <Input label="Nome" error={errors.name?.message} {...register('name')} />
          <Select label="Tipo" options={[{ value: 'PERCENTAGE', label: 'Percentual' }, { value: 'FIXED', label: 'Fixo (R$)' }, { value: 'FREE_SHIPPING', label: 'Frete grátis' }]} {...register('type')} />
          {type !== 'FREE_SHIPPING' && <Input label={type === 'PERCENTAGE' ? 'Percentual (%)' : 'Valor (R$)'} type="number" step="0.01" error={errors.value?.message} {...register('value', { valueAsNumber: true })} />}
          <Input label="Valor mínimo do pedido" type="number" step="0.01" error={errors.minimumOrderValue?.message} {...register('minimumOrderValue', { valueAsNumber: true })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Início" type="datetime-local" error={errors.startsAt?.message} {...register('startsAt')} />
            <Input label="Fim" type="datetime-local" error={errors.endsAt?.message} {...register('endsAt')} />
          </div>
          <Input label="Limite de uso" type="number" error={errors.usageLimit?.message} {...register('usageLimit', { valueAsNumber: true })} />
        </form>
      </Modal>
    </div>
  );
}
