import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Header } from '@/components/layout/header';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'E-Horta — Hortaliças e produtos frescos',
    template: '%s · E-Horta',
  },
  description:
    'Compre hortaliças, frutas e legumes frescos com entrega rápida. Do campo pra sua casa.',
};

export const viewport: Viewport = {
  themeColor: '#4c8c3f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">
        <Providers>
          <Suspense>
            <Header />
          </Suspense>
          <main className="pb-24 md:pb-10">{children}</main>
          <footer className="border-t border-cream-200 bg-cream-100 py-6 pb-24 text-center text-xs text-ink-400 md:pb-6">
            E-Horta © {new Date().getFullYear()} — Frescor do campo na sua mesa.
          </footer>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
