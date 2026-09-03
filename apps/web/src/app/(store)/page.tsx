'use client';

import Link from 'next/link';
import { CategoryChips } from '@/components/home/category-chips';
import { HeroBanner } from '@/components/home/hero-banner';
import { ProductCarousel } from '@/components/product/product-carousel';
import { ProductCardSkeleton } from '@/components/ui/skeleton';
import { friendlyMessage } from '@/lib/errors';
import { useBestSellers, useFeaturedProducts, usePromotions } from '@/hooks/use-products';

function CarouselSkeleton() {
  return (
    <div aria-busy="true" className="flex gap-3 overflow-hidden">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="w-44 shrink-0">
          <ProductCardSkeleton />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </p>
  );
}

export default function HomePage() {
  const featured = useFeaturedProducts(10);
  const promotions = usePromotions(10);
  const bestSellers = useBestSellers(10);

  return (
    <div className="flex flex-col gap-7 py-5">
      <HeroBanner />

      <section aria-labelledby="categorias-heading">
        <h2 id="categorias-heading" className="mb-2.5 text-lg font-bold text-ink-900">
          Categorias
        </h2>
        <CategoryChips />
      </section>

      {promotions.isError && <ErrorState message={friendlyMessage(promotions.error)} />}
      {promotions.data && promotions.data.length > 0 && (
        <ProductCarousel title="Ofertas" products={promotions.data} />
      )}
      {promotions.isLoading && <CarouselSkeleton />}

      {featured.isError && <ErrorState message={friendlyMessage(featured.error)} />}
      {featured.data && featured.data.length > 0 && (
        <ProductCarousel title="Destaques" products={featured.data} />
      )}
      {featured.isLoading && <CarouselSkeleton />}

      {bestSellers.isError && <ErrorState message={friendlyMessage(bestSellers.error)} />}
      {bestSellers.data && bestSellers.data.length > 0 && (
        <ProductCarousel title="Mais vendidos" products={bestSellers.data} />
      )}
      {bestSellers.isLoading && <CarouselSkeleton />}

      <p className="text-center text-sm text-ink-400">
        Não encontrou o que procurava?{' '}
        <Link href="/busca" className="font-semibold text-accent-600 hover:underline">
          Faça uma busca
        </Link>
      </p>
    </div>
  );
}
