'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard } from './product-card';
import type { Product } from '@/types/api';

interface ProductCarouselProps {
  title: string;
  products: Product[];
}

const SCROLL_STEP = 280;

export function ProductCarousel({ title, products }: ProductCarouselProps) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const maxScroll = track.scrollWidth - track.clientWidth;
    setCanScrollLeft(track.scrollLeft > 4);
    setCanScrollRight(track.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      track.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState]);

  function scroll(direction: -1 | 1) {
    trackRef.current?.scrollBy({ left: direction * SCROLL_STEP, behavior: 'smooth' });
  }

  if (products.length === 0) return null;

  const arrowClass = `flex h-9 w-9 items-center justify-center rounded-full border border-cream-300 bg-white text-ink-600 transition-colors hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-35`;

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
            disabled={!canScrollLeft}
            onClick={() => scroll(-1)}
            className={arrowClass}
          >
            <ChevronLeft size={18} aria-hidden />
          </button>
          <button
            type="button"
            aria-label={`Rolar ${title} para a direita`}
            disabled={!canScrollRight}
            onClick={() => scroll(1)}
            className={arrowClass}
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
