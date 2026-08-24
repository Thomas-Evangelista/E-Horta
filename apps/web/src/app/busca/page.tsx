import { Suspense } from 'react';
import { ProductGridSkeleton } from '@/components/ui/skeleton';
import { BuscaContent } from './busca-content';

export const metadata = { title: 'Busca' };

export default function BuscaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4 py-5">
          <h1 className="text-xl font-bold text-ink-900">Busca</h1>
          <ProductGridSkeleton />
        </div>
      }
    >
      <BuscaContent />
    </Suspense>
  );
}
