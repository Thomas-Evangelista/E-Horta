import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Meus pedidos',
  robots: { index: false },
};

export default function PedidosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
