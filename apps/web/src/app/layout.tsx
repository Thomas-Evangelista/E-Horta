import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Header } from '@/components/layout/header';
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register';
import { Providers } from './providers';
import { siteUrl } from '@/lib/seo';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'E-Horta — Hortaliças e produtos frescos',
    template: '%s · E-Horta',
  },
  description:
    'Compre hortaliças, frutas e legumes frescos com entrega rápida. Do campo pra sua casa.',
  applicationName: 'E-Horta',
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon-192.png',
    shortcut: '/icons/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'E-Horta',
  },
  openGraph: {
    type: 'website',
    siteName: 'E-Horta',
    locale: 'pt_BR',
    url: '/',
  },
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
        <ServiceWorkerRegister />
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
