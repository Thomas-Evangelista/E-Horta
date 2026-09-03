import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notificações',
  robots: { index: false },
};

export default function NotificacoesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
