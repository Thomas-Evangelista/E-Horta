'use client';

import Link from 'next/link';
import { useCategories } from '@/hooks/use-products';

export function CategoryChips() {
  const { data: categories, isLoading } = useCategories();

  if (isLoading) {
    return (
      <div className="flex gap-2" aria-busy="true">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-9 w-24 animate-pulse rounded-pill bg-cream-200" />
        ))}
      </div>
    );
  }

  if (!categories || categories.length === 0) return null;

  return (
    <nav aria-label="Categorias" className="relative">
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <li>
          <Link
            href="/categorias"
            className="inline-flex h-9 items-center rounded-pill border border-accent-500 bg-white px-4 text-sm font-semibold text-accent-600 hover:bg-accent-50"
          >
            Todas
          </Link>
        </li>
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={`/categorias/${category.slug}`}
              className="inline-flex h-9 items-center whitespace-nowrap rounded-pill border border-cream-300 bg-white px-4 text-sm font-medium text-ink-600 transition-colors hover:border-accent-400 hover:text-accent-600"
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-cream-50 to-transparent"
      />
    </nav>
  );
}
