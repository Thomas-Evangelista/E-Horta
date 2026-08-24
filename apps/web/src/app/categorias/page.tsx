'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useCategories } from '@/hooks/use-products';
import { friendlyMessage } from '@/lib/errors';

const CATEGORY_STYLE: Record<string, { emoji: string; bg: string; ring: string }> = {
  verduras: { emoji: '🥬', bg: 'bg-leaf-50', ring: 'group-hover:ring-leaf-200' },
  legumes: { emoji: '🥕', bg: 'bg-accent-50', ring: 'group-hover:ring-accent-200' },
  frutas: { emoji: '🍎', bg: 'bg-red-50', ring: 'group-hover:ring-red-200' },
  temperos: { emoji: '🌿', bg: 'bg-leaf-50', ring: 'group-hover:ring-leaf-200' },
  ervas: { emoji: '🌿', bg: 'bg-leaf-50', ring: 'group-hover:ring-leaf-200' },
  ovos: { emoji: '🥚', bg: 'bg-cream-100', ring: 'group-hover:ring-cream-300' },
  laticinios: { emoji: '🥛', bg: 'bg-cream-100', ring: 'group-hover:ring-cream-300' },
  graos: { emoji: '🌾', bg: 'bg-accent-50', ring: 'group-hover:ring-accent-200' },
  cogumelos: { emoji: '🍄', bg: 'bg-accent-50', ring: 'group-hover:ring-accent-200' },
};

const FALLBACK_STYLES = [
  { emoji: '🌱', bg: 'bg-leaf-50', ring: 'group-hover:ring-leaf-200' },
  { emoji: '🧺', bg: 'bg-accent-50', ring: 'group-hover:ring-accent-200' },
];

function styleFor(category: { slug: string; name: string }) {
  const key = category.slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (CATEGORY_STYLE[key]) return CATEGORY_STYLE[key];
  const nameKey = Object.keys(CATEGORY_STYLE).find((k) => key.includes(k));
  if (nameKey) return CATEGORY_STYLE[nameKey];
  let hash = 0;
  for (const ch of category.slug) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return FALLBACK_STYLES[Math.abs(hash) % FALLBACK_STYLES.length];
}

export default function CategoriasPage() {
  const { data: categories, isLoading, isError, error } = useCategories();
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col gap-5 py-5">
      <header className="flex items-center gap-3">
        <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-card bg-leaf-100 text-2xl">
          🧺
        </span>
        <div>
          <h1 className="text-xl font-extrabold text-ink-900">Categorias</h1>
          <p className="text-sm text-ink-500">Escolha uma seção e encha a cesta</p>
        </div>
      </header>

      {isLoading && (
        <ul aria-busy="true" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="h-36 animate-pulse rounded-card bg-cream-200" />
          ))}
        </ul>
      )}

      {isError && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {friendlyMessage(error)}
        </p>
      )}

      {categories && categories.length === 0 && (
        <p className="py-10 text-center text-sm text-ink-400">
          Nenhuma categoria disponível no momento.
        </p>
      )}

      {categories && categories.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category, index) => {
            const style = styleFor(category);
            return (
              <motion.li
                key={category.id}
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.05, 0.4), duration: 0.3, ease: 'easeOut' }}
              >
                <Link
                  href={`/categorias/${category.slug}`}
                  className={`group relative flex h-36 flex-col justify-between overflow-hidden rounded-card ${style.bg} p-4 shadow-card ring-1 ring-transparent transition-all hover:-translate-y-0.5 hover:shadow-md ${style.ring}`}
                >
                  <span aria-hidden className="text-4xl drop-shadow-sm transition-transform duration-200 group-hover:scale-110">
                    {style.emoji}
                  </span>
                  <span>
                    <span className="block pr-5 text-base font-extrabold leading-tight text-ink-900">
                      {category.name}
                    </span>
                    {category.description && (
                      <span className="mt-0.5 line-clamp-1 block text-xs text-ink-500">
                        {category.description}
                      </span>
                    )}
                  </span>
                  <span
                    aria-hidden
                    className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-ink-600 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                  >
                    <ArrowUpRight size={15} />
                  </span>
                </Link>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
