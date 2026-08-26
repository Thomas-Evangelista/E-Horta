'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Tags,
  Box,
  Tag,
  Star,
  LogOut,
  ChevronLeft,
  Menu,
} from 'lucide-react';
import { useState } from 'react';
import { useSessionStore } from '@/stores/session';
import { AnimatePresence, motion } from 'framer-motion';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/produtos', label: 'Produtos', icon: Package },
  { href: '/pedidos', label: 'Pedidos', icon: ShoppingCart },
  { href: '/usuarios', label: 'Usuários', icon: Users },
  { href: '/categorias', label: 'Categorias', icon: Tags },
  { href: '/estoque', label: 'Estoque', icon: Box },
  { href: '/promocoes', label: 'Promoções', icon: Tag },
  { href: '/avaliacoes', label: 'Avaliações', icon: Star },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const logout = useSessionStore((s) => s.logout);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? 'bg-accent-50 text-accent-700' : 'text-ink-500 hover:bg-cream-100 hover:text-ink-800'
            }`}
          >
            <Icon size={20} />
            {!collapsed && <span>{label}</span>}
          </Link>
        );
      })}
      <div className="mt-auto" />
      <button
        onClick={() => { logout(); window.location.href = '/login'; }}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-500 hover:bg-cream-100 hover:text-red-600"
      >
        <LogOut size={20} />
        {!collapsed && <span>Sair</span>}
      </button>
    </nav>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-3 z-header rounded-lg p-2 text-ink-600 hover:bg-cream-100 lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu size={22} />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-sidebar bg-ink-900/40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 z-sidebar flex h-full w-[260px] flex-col border-r border-cream-200 bg-white lg:hidden"
            >
              <div className="flex h-14 items-center border-b border-cream-200 px-4">
                <span className="text-base font-bold text-ink-900">E-Horta Admin</span>
                <button onClick={() => setMobileOpen(false)} className="ml-auto rounded-lg p-1.5 text-ink-400 hover:bg-cream-100" aria-label="Fechar menu">
                  <ChevronLeft size={18} />
                </button>
              </div>
              {nav}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-sidebar lg:flex lg:flex-col lg:border-r lg:border-cream-200 lg:bg-white lg:transition-all ${
          collapsed ? 'lg:w-[68px]' : 'lg:w-[260px]'
        }`}
      >
        <div className="flex h-14 items-center border-b border-cream-200 px-4">
          {!collapsed && <span className="text-base font-bold text-ink-900">E-Horta Admin</span>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`ml-auto rounded-lg p-1.5 text-ink-400 hover:bg-cream-100 ${collapsed ? 'mx-auto' : ''}`}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            <ChevronLeft size={18} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
        {nav}
      </aside>
    </>
  );
}
