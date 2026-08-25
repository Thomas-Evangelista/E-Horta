import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Carrinho',
};

export default function CarrinhoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
