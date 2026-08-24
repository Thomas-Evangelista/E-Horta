'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { ProductGrid } from '@/components/product/product-grid';
import { ProductGridSkeleton } from '@/components/ui/skeleton';
import { friendlyMessage } from '@/lib/errors';
import { useProductSearch } from '@/hooks/use-products';

export function BuscaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get('q')?.trim() ?? '';
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10) || 1;
  const { data, isLoading, isError, error } = useProductSearch(q, page);

  useEffect(() => {
    if (!q) router.replace('/busca');
  }, [q, router]);

  if (!q) {
    return (
      <div className="py-16 text-center text-sm text-ink-400">
        Digite um termo no campo de busca acima.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-5">
      <header>
        <h1 className="text-xl font-bold text-ink-900">Resultados para “{q}”</h1>
        {!isLoading && data && (
          <p className="text-sm text-ink-400">
            {data.total} {data.total === 1 ? 'produto encontrado' : 'produtos encontrados'}
          </p>
        )}
      </header>

      {isLoading && <ProductGridSkeleton />}
      {isError && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {friendlyMessage(error)}
        </p>
      )}
      {data && data.items.length === 0 && (
        <p className="py-10 text-center text-sm text-ink-500">
          Nenhum produto encontrado. Tente outro termo.
        </p>
      )}
      {data && data.items.length > 0 && <ProductGrid products={data.items} />}

      {data && data.totalPages > 1 && (
        <nav aria-label="Paginação" className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => router.push(`/busca?q=${encodeURIComponent(q)}&page=${page - 1}`)}
            className="rounded-pill border border-cream-300 px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            Anterior
          </button>
          <span aria-current="page" className="text-sm font-semibold text-ink-600">
            Página {page} de {data.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= data.totalPages}
            onClick={() => router.push(`/busca?q=${encodeURIComponent(q)}&page=${page + 1}`)}
            className="rounded-pill border border-cream-300 px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            Próxima
          </button>
        </nav>
      )}
    </div>
  );
}
