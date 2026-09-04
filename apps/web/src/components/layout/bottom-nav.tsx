'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Home, Package, ShoppingCart, ShoppingBasket, User } from 'lucide-react';
import { useUnreadNotificationsCount } from '@/hooks/use-notifications';
import { useSessionStore } from '@/stores/session';

function NotificationsBadge() {
  const user = useSessionStore((state) => state.user);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(useSessionStore.persist.hasHydrated());
    return useSessionStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  const { data: unread } = useUnreadNotificationsCount(hydrated && Boolean(user));
  const count = user ? (unread ?? 0) : 0;
  if (count === 0) return null;

  return (
    <span
      aria-hidden
      className="absolute right-1 top-1.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white"
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  badge?: boolean;
}

const ITEMS: NavItem[] = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/categorias', label: 'Categorias', icon: ShoppingBasket },
  { href: '/carrinho', label: 'Carrinho', icon: ShoppingCart },
  { href: '/pedidos', label: 'Pedidos', icon: Package },
  { href: '/notificacoes', label: 'Avisos', icon: Bell, badge: true },
  { href: '/conta', label: 'Conta', icon: User },
];

/**
 * Renderizado via portal em `document.body`: fica FORA de qualquer ancestral
 * que possa criar containing block e quebrar o position:fixed.
 */
export function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return createPortal(
    <nav
      aria-label="Navegação principal"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      className="z-50 border-t border-cream-200 bg-white shadow-nav md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {ITEMS.map(({ href, label, icon: Icon, badge }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-0.5 py-2 text-[10px] font-medium transition-colors ${
                  active ? 'text-accent-600' : 'text-ink-500 hover:text-ink-800'
                }`}
              >
                <span className="relative">
                  <Icon size={20} aria-hidden />
                  {badge && <NotificationsBadge />}
                </span>
                {label}
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-accent-500"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>,
    document.body,
  );
}
