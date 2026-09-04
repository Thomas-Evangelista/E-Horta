import { Suspense } from 'react';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Header } from '@/components/layout/header';
import { ToastProvider } from '@/components/feedback/toast';
import { SkipLink } from '@/components/ui/skip-link';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <SkipLink />
      <Suspense>
        <Header />
      </Suspense>
      <main id="conteudo-principal" className="pb-24 md:pb-10">{children}</main>
      <footer className="border-t border-cream-200 bg-cream-100 py-6 pb-24 text-center text-xs text-ink-400 md:pb-6">
        E-Horta © {new Date().getFullYear()} — Frescor do campo na sua mesa.
      </footer>
      <BottomNav />
    </ToastProvider>
  );
}
