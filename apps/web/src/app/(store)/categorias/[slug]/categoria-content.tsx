'use client';

import Link from 'next/link';
import { ProductGrid } from '@/components/product/product-grid';
import { ProductGridSkeleton } from '@/components/ui/skeleton';
import { friendlyMessage } from '@/lib/errors';
import { useProducts } from '@/hooks/use-products';

export function CategoriaContent({ slug }: { slug: string }) {
  const { data, isLoading, isError, error } = useProducts({
    category: slug,
    available: true,
    sort: 'name-asc',
  });

  return (
    <div className="flex flex-col gap-4 py-5">
      <nav aria-label="Trilha de navegação" className="text-sm text-ink-400">
        <Link href="/categorias" className="hover:text-accent-600">
          Categorias
        </Link>
        <span aria-hidden> / </span>
        <span className="font-medium text-ink-600">{data?.items[0]?.category?.name ?? slug}</span>
      </nav>

      <h1 className="text-xl font-bold capitalize text-ink-900">{slug.replace(/-/g, ' ')}</h1>

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
    </div>
  );
}
