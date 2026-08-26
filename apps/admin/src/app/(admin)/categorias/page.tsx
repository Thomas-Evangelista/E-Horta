'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { PageSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/feedback/toast';
import { friendlyMessage } from '@/lib/errors';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const catSchema = z.object({
  name: z.string().min(3).max(80),
  slug: z.string().min(3).max(80),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional(),
  sortOrder: z.coerce.number().min(0).optional(),
});

type CatForm = z.infer<typeof catSchema>;

type Category = { id: string; name: string; slug: string; description?: string; imageUrl?: string; sortOrder: number; isActive: boolean; _count?: { products: number } };

export default function CategoriesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => {
      const env = await apiRequest<{ categories: Category[] }>('/admin/categories');
      return env.data?.categories ?? [];
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CatForm>({
    resolver: zodResolver(catSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (d: CatForm) => apiRequest('/admin/categories', { body: d }),
    onSuccess: () => { toast('success', 'Categoria criada!'); void qc.invalidateQueries({ queryKey: queryKeys.categories }); closeModal(); },
    onError: (err: unknown) => toast('error', friendlyMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: async (d: CatForm) => apiRequest(`/admin/categories/${editingCat?.id}`, { method: 'PATCH', body: d }),
    onSuccess: () => { toast('success', 'Categoria atualizada!'); void qc.invalidateQueries({ queryKey: queryKeys.categories }); closeModal(); },
    onError: (err: unknown) => toast('error', friendlyMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest(`/admin/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast('success', 'Categoria removida'); void qc.invalidateQueries({ queryKey: queryKeys.categories }); },
    onError: (err: unknown) => toast('error', friendlyMessage(err)),
  });

  const toggleActive = useMutation({
    mutationFn: async (cat: Category) => apiRequest(`/admin/categories/${cat.id}`, { method: 'PATCH', body: { isActive: !cat.isActive } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.categories }),
  });

  function openCreate() {
    setEditingCat(null);
    reset({ name: '', slug: '', description: undefined, imageUrl: undefined, sortOrder: undefined });
    setModalOpen(true);
  }

  function openEdit(cat: Category) {
    setEditingCat(cat);
    reset({ name: cat.name, slug: cat.slug, description: cat.description ?? undefined, imageUrl: cat.imageUrl ?? undefined, sortOrder: cat.sortOrder });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingCat(null);
  }

  const categories = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Categorias"
        description={`${categories.length} categorias`}
        actions={<Button size="sm" onClick={openCreate}><Plus size={16} /> Nova categoria</Button>}
      />

      {isLoading && <PageSkeleton rows={5} />}
      {isError && <EmptyState message={friendlyMessage(error)} onRetry={refetch} />}
      {!isLoading && !isError && categories.length === 0 && <EmptyState message="Nenhuma categoria" />}

      {!isLoading && !isError && categories.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <Card key={cat.id} className="flex flex-col">
              <div className="flex items-start justify-between p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-ink-800">{cat.name}</h3>
                    <Badge tone={cat.isActive ? 'leaf' : 'red'}>{cat.isActive ? 'Ativo' : 'Inativo'}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink-400">/{cat.slug} · {cat._count?.products ?? 0} produtos</p>
                  {cat.description && <p className="mt-2 text-sm text-ink-500 line-clamp-2">{cat.description}</p>}
                </div>
              </div>
              <div className="mt-auto flex gap-1 border-t border-cream-100 p-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}><Pencil size={14} /> Editar</Button>
                <Button variant="ghost" size="sm" onClick={() => toggleActive.mutate(cat)}>
                  {cat.isActive ? 'Desativar' : 'Ativar'}
                </Button>
                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => { if (confirm('Remover categoria?')) deleteMutation.mutate(cat.id); }}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingCat ? 'Editar categoria' : 'Nova categoria'}
        footer={
          <Button loading={createMutation.isPending || updateMutation.isPending} onClick={handleSubmit((d) => editingCat ? updateMutation.mutate(d) : createMutation.mutate(d))}>
            {editingCat ? 'Salvar' : 'Criar'}
          </Button>
        }
      >
        <form className="flex flex-col gap-4">
          <Input label="Nome" error={errors.name?.message} {...register('name')} />
          <Input label="Slug" placeholder="minha-categoria" error={errors.slug?.message} {...register('slug')} />
          <Textarea label="Descrição" error={errors.description?.message} {...register('description')} />
          <Input label="URL da imagem" placeholder="https://..." error={errors.imageUrl?.message} {...register('imageUrl')} />
          <Input label="Ordem" type="number" error={errors.sortOrder?.message} {...register('sortOrder', { valueAsNumber: true })} />
        </form>
      </Modal>
    </div>
  );
}
