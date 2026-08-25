import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Categorias',
  description:
    'Explore nossas categorias de verduras, legumes, frutas e produtos frescos com entrega rápida.',
  alternates: { canonical: '/categorias' },
};

export default function CategoriasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
