import { Suspense } from 'react';
import { ProdutosContent } from './produtos-content';

export const metadata = { title: 'Produtos' };

export default function ProdutosPage() {
  return (
    <Suspense>
      <ProdutosContent />
    </Suspense>
  );
}
