'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import { ProductGrid } from '@/components/product/product-grid';
import { ProductGridSkeleton } from '@/components/ui/skeleton';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { friendlyMessage } from '@/lib/errors';
import { useProducts, useCategories } from '@/hooks/use-products';

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Nome A–Z' },
  { value: 'name-desc', label: 'Nome Z–A' },
  { value: 'price-asc', label: 'Menor preço' },
  { value: 'price-desc', label: 'Maior preço' },
  { value: 'newest', label: 'Mais recentes' },
];

function parseParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function CategoriaContent({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sort = searchParams.get('sort') ?? 'name-asc';
  const minPrice = parseParam(searchParams.get('min'));
  const maxPrice = parseParam(searchParams.get('max'));
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10) || 1;

  const { data: categories } = useCategories();
  const { data, isLoading, isError, error } = useProducts({
    category: slug,
    minPrice,
    maxPrice,
    available: true,
    sort: sort as SORT_OPTIONS_SORT,
    page,
    limit: 12,
  });

  const categoryName = data?.items[0]?.category?.name ?? categories?.find((c) => c.slug === slug)?.name ?? slug;

  function updateParams(next: Record<string, string | number | undefined>, resetPage = true) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === '') params.delete(key);
      else params.set(key, String(value));
    }
    if (resetPage && next.page === undefined) params.delete('page');
    const qs = params.toString();
    router.push(qs ? `/categorias/${slug}?${qs}` : `/categorias/${slug}`);
  }

  const hasPriceFilter = minPrice !== undefined || maxPrice !== undefined;

  return (
    <div className="flex flex-col gap-4 py-5">
      <nav aria-label="Trilha de navegação" className="text-sm text-ink-400">
        <Link href="/categorias" className="hover:text-accent-600">
          Categorias
        </Link>
        <span aria-hidden> / </span>
        <span className="font-medium text-ink-600">{data?.items[0]?.category?.name ?? slug}</span>
      </nav>

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold capitalize text-ink-900">{categoryName}</h1>
        {!isLoading && data && (
          <p className="text-sm text-ink-400">
            {data.total} {data.total === 1 ? 'produto' : 'produtos'}
          </p>
        )}
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <Select
          aria-label="Ordenar por"
          value={sort}
          onChange={(e) => updateParams({ sort: e.target.value || undefined })}
          options={SORT_OPTIONS}
          className="w-auto"
        />

        <details className="group relative">
          <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-cream-300 bg-white px-4 text-sm font-medium text-ink-700 [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal size={16} aria-hidden />
            Preço
            {hasPriceFilter && <span className="h-2 w-2 rounded-full bg-accent-500" aria-hidden />}
          </summary>
          <div className="absolute right-0 z-30 mt-2 w-72 rounded-card border border-cream-200 bg-white p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink-800">Faixa de preço</p>
              {hasPriceFilter && (
                <button
                  type="button"
                  onClick={() => updateParams({ min: undefined, max: undefined })}
                  className="flex items-center gap-1 text-xs font-medium text-accent-600 hover:underline"
                >
                  <X size={13} aria-hidden /> Limpar
                </button>
              )}
            </div>
            <div className="flex items-end gap-2">
              <Input
                label="Mín."
                type="number"
                min={0}
                placeholder="0"
                value={minPrice ?? ''}
                onChange={(e) => updateParams({ min: e.target.value === '' ? undefined : e.target.value })}
                className="h-10"
              />
              <span aria-hidden className="pb-3 text-ink-400">–</span>
              <Input
                label="Máx."
                type="number"
                min={0}
                placeholder="0"
                value={maxPrice ?? ''}
                onChange={(e) => updateParams({ max: e.target.value === '' ? undefined : e.target.value })}
                className="h-10"
              />
            </div>
          </div>
        </details>
      </div>

      {isLoading && <ProductGridSkeleton />}
      {isError && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {friendlyMessage(error)}
        </p>
      )}
      {data && data.items.length === 0 && (
        <p className="py-10 text-center text-sm text-ink-500">Nenhum produto nesta categoria ainda.</p>
      )}
      {data && data.items.length > 0 && <ProductGrid products={data.items} />}

      {data && data.totalPages > 1 && (
        <Pagination page={data.page} totalPages={data.totalPages} onPageChange={(p) => updateParams({ page: p }, false)} />
      )}
    </div>
  );
}

type SORT_OPTIONS_SORT = 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'newest';
