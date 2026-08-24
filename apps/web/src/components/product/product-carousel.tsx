'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard } from './product-card';
import type { Product } from '@/types/api';

interface ProductCarouselProps {
  title: string;
  products: Product[];
}

export function ProductCarousel({ title, products }: ProductCarouselProps) {
  const trackRef = useRef<HTMLUListElement>(null);

  function scroll(direction: -1 | 1) {
    trackRef.current?.scrollBy({ left: direction * 280, behavior: 'smooth' });
  }

  if (products.length === 0) return null;

  return (
    <section aria-labelledby={`carousel-${title}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 id={`carousel-${title}`} className="text-lg font-bold text-ink-900">
          {title}
        </h2>
        <div className="hidden gap-1.5 sm:flex">
          <button
            type="button"
            aria-label={`Rolar ${title} para a esquerda`}
            onClick={() => scroll(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-cream-300 bg-white text-ink-600 hover:bg-cream-50"
          >
            <ChevronLeft size={18} aria-hidden />
          </button>
          <button
            type="button"
            aria-label={`Rolar ${title} para a direita`}
            onClick={() => scroll(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-cream-300 bg-white text-ink-600 hover:bg-cream-50"
          >
            <ChevronRight size={18} aria-hidden />
          </button>
        </div>
      </div>

      <ul
        ref={trackRef}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <li key={product.id} className="w-44 shrink-0 snap-start sm:w-48">
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}
