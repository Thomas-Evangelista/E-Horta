'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Home, Package, Search, ShoppingBasket, User } from 'lucide-react';

const ITEMS = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/categorias', label: 'Categorias', icon: ShoppingBasket },
  { href: '/busca', label: 'Buscar', icon: Search },
  { href: '/pedidos', label: 'Pedidos', icon: Package },
  { href: '/conta', label: 'Conta', icon: User },
] as const;

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
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors ${
                  active ? 'text-accent-600' : 'text-ink-500 hover:text-ink-800'
                }`}
              >
                <Icon size={20} aria-hidden />
                {label}
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-accent-500"
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
