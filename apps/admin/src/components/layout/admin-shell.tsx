'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/stores/session';
import { Sidebar } from '@/components/layout/sidebar';
import { FullPageSpinner } from '@/components/ui/skeleton';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(useSessionStore.persist.hasHydrated());
    return useSessionStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated && !user) router.replace('/login');
  }, [hydrated, user, router]);

  if (!hydrated || !user) return <FullPageSpinner />;

  return (
    <div className="min-h-dvh">
      <Sidebar />
      <div className="transition-all lg:pl-[260px]">
        <header className="sticky top-0 z-header flex h-14 items-center border-b border-cream-200 bg-cream-50/95 px-6 backdrop-blur lg:pl-6">
          <div className="ml-10 lg:ml-0">
            <p className="text-sm text-ink-400">Olá, <span className="font-medium text-ink-800">{user.name}</span></p>
          </div>
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
