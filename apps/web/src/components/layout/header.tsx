'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Bell, Search, ShoppingCart } from 'lucide-react';
import { Container } from './container';
import { useCart } from '@/hooks/use-cart';
import { useUnreadNotificationsCount } from '@/hooks/use-notifications';
import { useSessionStore } from '@/stores/session';

function CartBadge() {
  const { data: cart } = useCart();
  const count = cart?.itemCount ?? 0;
  const reduceMotion = useReducedMotion();

  return (
    <Link
      href="/carrinho"
      aria-label={
        count > 0 ? `Carrinho de compras, ${count} ${count === 1 ? 'item' : 'itens'}` : 'Carrinho de compras'
      }
      className="relative hidden h-10 w-10 items-center justify-center rounded-full hover:bg-cream-100 sm:flex"
    >
      <ShoppingCart size={20} aria-hidden className="text-ink-600" />
      <motion.span
        key={count}
        initial={reduceMotion ? false : { scale: 0.4 }}
        animate={count > 0 ? { scale: 1 } : { scale: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 22 }}
        aria-hidden
        className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-white"
      >
        {count}
      </motion.span>
    </Link>
  );
}

function NotificationsBadge() {
  const user = useSessionStore((state) => state.user);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(useSessionStore.persist.hasHydrated());
    return useSessionStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  const { data: unread } = useUnreadNotificationsCount(hydrated && Boolean(user));
  const count = user ? (unread ?? 0) : 0;
  const reduceMotion = useReducedMotion();

  return (
    <Link
      href="/notificacoes"
      aria-label={
        count > 0
          ? `Notificações, ${count} não ${count === 1 ? 'lida' : 'lidas'}`
          : 'Notificações'
      }
      className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-cream-100"
    >
      <Bell size={20} aria-hidden className="text-ink-600" />
      <motion.span
        key={count}
        initial={reduceMotion ? false : { scale: 0.4 }}
        animate={count > 0 ? { scale: 1 } : { scale: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 22 }}
        aria-hidden
        className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-white"
      >
        {count > 9 ? '9+' : count}
      </motion.span>
    </Link>
  );
}

export function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [term, setTerm] = useState(searchParams.get('q') ?? '');

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const query = term.trim();
    if (!query) return;
    router.push(`/busca?q=${encodeURIComponent(query)}`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-cream-200 bg-cream-50/95 backdrop-blur">
      <Container>
        <div className="flex h-14 items-center gap-3 md:h-16">
          <Link
            href="/"
            aria-label="E-Horta — página inicial"
            className="flex shrink-0 items-center gap-1.5 text-lg font-extrabold tracking-tight text-leaf-700"
          >
            <span aria-hidden>🥬</span>
            <span>
              E<span className="text-accent-500">-</span>Horta
            </span>
          </Link>

          <form role="search" onSubmit={submitSearch} className="ml-auto flex max-w-md flex-1 items-center">
            <label htmlFor="global-search" className="sr-only">
              Buscar produtos
            </label>
            <input
              id="global-search"
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Buscar produtos..."
              className="h-10 w-full rounded-l-xl border border-r-0 border-cream-300 bg-white px-3.5 text-sm placeholder:text-ink-400"
            />
            <button
              type="submit"
              aria-label="Buscar"
              className="flex h-10 w-11 items-center justify-center rounded-r-xl bg-accent-500 text-white transition-colors hover:bg-accent-600"
            >
              <Search size={18} aria-hidden />
            </button>
          </form>

          <NotificationsBadge />
          <CartBadge />
        </div>
      </Container>
    </header>
  );
}
