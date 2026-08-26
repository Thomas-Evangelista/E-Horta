'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { formatPrice } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { PageSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/components/feedback/toast';
import { friendlyMessage } from '@/lib/errors';
import { Plus, Search, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

type Product = {
  id: string; name: string; slug: string; price: number; compareAtPrice?: number;
  sku: string; unit: string; isActive: boolean; isFeatured: boolean;
  category: { name: string }; imageUrl?: string;
};

export default function ProductsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.products({ page, search, isActive: activeFilter }),
    queryFn: async () => {
      const env = await apiRequest<{ products: Product[] }>('/admin/products', {
        query: { page, limit: 15, search: search || undefined, isActive: activeFilter || undefined },
      });
      return env;
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (p: Product) => apiRequest(`/admin/products/${p.id}`, { method: 'PATCH', body: { isActive: !p.isActive } }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['admin', 'products'] }); toast('success', 'Status atualizado'); },
    onError: (err: unknown) => toast('error', friendlyMessage(err)),
  });

  const products = data?.data?.products ?? [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Produtos"
        description={`${meta?.total ?? 0} produtos cadastrados`}
        actions={
          <Link href="/produtos/novo">
            <Button size="sm"><Plus size={16} /> Novo produto</Button>
          </Link>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Buscar produto..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
            className="h-10 w-full rounded-xl border border-cream-300 bg-white pl-9 pr-3 text-sm text-ink-800 placeholder:text-ink-400"
          />
        </div>
        <Select
          label=""
          value={activeFilter}
          onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
          options={[
            { value: 'true', label: 'Ativos' },
            { value: 'false', label: 'Inativos' },
          ]}
          placeholder="Todos"
          className="!h-10 w-auto"
        />
      </div>

      {isLoading && <PageSkeleton rows={8} />}
      {isError && <EmptyState message={friendlyMessage(error)} onRetry={refetch} />}
      {!isLoading && !isError && products.length === 0 && <EmptyState message="Nenhum produto encontrado" />}

      {!isLoading && !isError && products.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-left text-xs font-medium uppercase text-ink-400">
                  <th className="px-5 py-3">Produto</th>
                  <th className="px-5 py-3">SKU</th>
                  <th className="px-5 py-3">Categoria</th>
                  <th className="px-5 py-3 text-right">Preço</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-cream-100 last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cream-100 text-xs text-ink-400">img</div>
                        )}
                        <div>
                          <p className="font-medium text-ink-800">{p.name}</p>
                          <p className="text-xs text-ink-400">{p.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-ink-500">{p.sku}</td>
                    <td className="px-5 py-3 text-ink-500">{p.category?.name}</td>
                    <td className="px-5 py-3 text-right font-medium text-ink-800">
                      {formatPrice(p.price)}
                      {p.compareAtPrice && p.compareAtPrice > p.price && (
                        <span className="ml-1 text-xs text-ink-400 line-through">{formatPrice(p.compareAtPrice)}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Badge tone={p.isActive ? 'leaf' : 'red'}>{p.isActive ? 'Ativo' : 'Inativo'}</Badge>
                      {p.isFeatured && <Badge tone="accent" className="ml-1">Destaque</Badge>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => toggleActive.mutate(p)}>
                          {p.isActive ? '⏸' : '▶'}
                        </Button>
                        <Link href={`/produtos/${p.id}/editar`}>
                          <Button variant="ghost" size="icon"><Pencil size={16} /></Button>
                        </Link>
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
    </div>
  );
}
