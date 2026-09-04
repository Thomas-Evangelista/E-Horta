import type { Metadata, Viewport } from 'next';
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register';
import { InstallPrompt } from '@/components/pwa/install-prompt';
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
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className="min-h-dvh">
        <ServiceWorkerRegister />
        <Providers>{children}</Providers>
        <InstallPrompt />
      </body>
    </html>
  );
}
