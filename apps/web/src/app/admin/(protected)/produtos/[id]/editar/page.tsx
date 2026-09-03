'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { queryKeys } from '@/lib/admin/query-keys';
import { useToast } from '@/components/admin/feedback/toast';
import { friendlyMessage } from '@/lib/errors';
import { Button } from '@/components/admin/ui/button';
import { Input } from '@/components/admin/ui/input';
import { Select } from '@/components/admin/ui/select';
import { Textarea } from '@/components/admin/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/admin/ui/card';
import { PageHeader } from '@/components/admin/ui/page-header';
import { FullPageSpinner } from '@/components/admin/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const productSchema = z.object({
  name: z.string().min(3).max(120),
  slug: z.string().min(3).max(120),
  categoryId: z.string().uuid(),
  sku: z.string().min(1),
  unit: z.enum(['UN', 'KG', 'G', 'PACK', 'BUNCH']),
  price: z.coerce.number().positive(),
  compareAtPrice: z.coerce.number().positive().optional(),
  costPrice: z.coerce.number().min(0).optional(),
  weight: z.coerce.number().positive().optional(),
  description: z.string().max(5000).optional(),
  shortDescription: z.string().max(255).optional(),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
});

type ProductForm = z.infer<typeof productSchema>;

type Product = {
  id: string; name: string; slug: string; price: number; compareAtPrice?: number;
  costPrice?: number; weight?: number; sku: string; unit: string;
  description?: string; shortDescription?: string; imageUrl?: string;
  isActive: boolean; isFeatured: boolean; categoryId: string;
};

type Category = { id: string; name: string };

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: queryKeys.productDetail(id),
    queryFn: async () => {
      const env = await apiRequest<Product>(`/admin/products/${id}`);
      return env.data!;
    },
  });

  const { data: categories } = useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => {
      const env = await apiRequest<{ categories: Category[] }>('/admin/categories');
      return env.data?.categories ?? [];
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
  });

  if (product && !watch('name')) {
    setTimeout(() => {
      reset({
        name: product.name,
        slug: product.slug,
        categoryId: product.categoryId,
        sku: product.sku,
        unit: product.unit as ProductForm['unit'],
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        costPrice: product.costPrice,
        weight: product.weight,
        description: product.description,
        shortDescription: product.shortDescription,
        imageUrl: product.imageUrl,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
      });
    }, 0);
  }

  const updateMutation = useMutation({
    mutationFn: async (data: ProductForm) => apiRequest(`/admin/products/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => {
      toast('success', 'Produto atualizado!');
      void qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      router.push('/admin/produtos');
    },
    onError: (err: unknown) => toast('error', friendlyMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => apiRequest(`/admin/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast('success', 'Produto removido');
      void qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      router.push('/admin/produtos');
    },
    onError: (err: unknown) => toast('error', friendlyMessage(err)),
  });

  if (loadingProduct) return <FullPageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Editar Produto"
        actions={
          <Link href="/admin/produtos">
            <Button variant="ghost" size="sm"><ArrowLeft size={16} /> Voltar</Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="flex flex-col gap-6">
        <Card>
          <CardHeader><h2 className="text-sm font-bold text-ink-800">Informações básicas</h2></CardHeader>
          <CardContent className="flex flex-col gap-4 sm:grid sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input label="Nome" error={errors.name?.message} {...register('name')} />
            </div>
            <Input label="Slug" error={errors.slug?.message} {...register('slug')} />
            <Select
              label="Categoria"
              placeholder="Selecione..."
              error={errors.categoryId?.message}
              options={(categories ?? []).map((c) => ({ value: c.id, label: c.name }))}
              {...register('categoryId')}
            />
            <Input label="SKU" error={errors.sku?.message} {...register('sku')} />
            <Select
              label="Unidade"
              options={[
                { value: 'UN', label: 'Unidade' },
                { value: 'KG', label: 'Quilograma' },
                { value: 'G', label: 'Grama' },
                { value: 'PACK', label: 'Pacote' },
                { value: 'BUNCH', label: 'Maço' },
              ]}
              {...register('unit')}
            />
            <Input label="Descrição curta" error={errors.shortDescription?.message} {...register('shortDescription')} />
            <div className="sm:col-span-2">
              <Textarea label="Descrição" error={errors.description?.message} {...register('description')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-sm font-bold text-ink-800">Preços</h2></CardHeader>
          <CardContent className="flex flex-col gap-4 sm:grid sm:grid-cols-3">
            <Input label="Preço (R$)" type="number" step="0.01" error={errors.price?.message} {...register('price')} />
            <Input label="Preço de comparação" type="number" step="0.01" error={errors.compareAtPrice?.message} {...register('compareAtPrice', { valueAsNumber: true })} />
            <Input label="Preço de custo" type="number" step="0.01" error={errors.costPrice?.message} {...register('costPrice', { valueAsNumber: true })} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-sm font-bold text-ink-800">Imagem e visibilidade</h2></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Input label="URL da imagem" placeholder="https://..." error={errors.imageUrl?.message} {...register('imageUrl')} />
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm text-ink-600">
                <input type="checkbox" checked={watch('isActive')} onChange={(e) => setValue('isActive', e.target.checked)} className="h-4 w-4 rounded accent-leaf-600" />
                Ativo
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-600">
                <input type="checkbox" checked={watch('isFeatured')} onChange={(e) => setValue('isFeatured', e.target.checked)} className="h-4 w-4 rounded accent-accent-500" />
                Destaque
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="danger" type="button" onClick={() => { if (confirm('Remover este produto?')) deleteMutation.mutate(); }} loading={deleteMutation.isPending}>
            Remover
          </Button>
          <div className="flex gap-3">
            <Link href="/admin/produtos"><Button variant="ghost">Cancelar</Button></Link>
            <Button type="submit" loading={updateMutation.isPending}>Salvar</Button>
          </div>
        </div>
      </form>
    </div>
  );
}
