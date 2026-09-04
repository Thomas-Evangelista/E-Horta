'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/stores/session';
import { Sidebar } from '@/components/admin/layout/sidebar';
import { FullPageSpinner } from '@/components/admin/ui/skeleton';
import { SkipLink } from '@/components/ui/skip-link';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(useSessionStore.persist.hasHydrated());
    return useSessionStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    // Sessão de um CUSTOMER não dá acesso ao painel — só ADMIN passa.
    if (hydrated && (!user || user.role !== 'ADMIN')) router.replace('/admin/login');
  }, [hydrated, user, router]);

  if (!hydrated || !user || user.role !== 'ADMIN') return <FullPageSpinner />;

  return (
    <div className="min-h-dvh">
      <SkipLink />
      <Sidebar />
      <div className="transition-all lg:pl-[260px]">
        <header className="sticky top-0 z-header flex h-14 items-center border-b border-cream-200 bg-cream-50/95 px-6 backdrop-blur lg:pl-6">
          <div className="ml-10 lg:ml-0">
            <p className="text-sm text-ink-400">Olá, <span className="font-medium text-ink-800">{user.name}</span></p>
          </div>
        </header>
        <main id="conteudo-principal" className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
