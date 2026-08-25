'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

export function HeroBanner() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      aria-label="Destaque da semana"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="relative flex items-center justify-between overflow-hidden rounded-card bg-leaf-600 p-5 text-white sm:p-7"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-leaf-500/40 blur-xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-16 left-1/3 h-36 w-36 rounded-full bg-accent-400/20 blur-xl"
      />

      <div className="relative max-w-[70%]">
        <p className="text-xs font-semibold uppercase tracking-wider text-leaf-100">
          Fresquinho da horta
        </p>
        <h2 className="mt-1 text-xl font-extrabold leading-tight sm:text-2xl">
          Do campo pra sua casa em até 2 dias
        </h2>
        <p className="mt-1.5 hidden text-sm text-leaf-100 sm:block">
          Hortaliças, frutas e legumes selecionados com entrega rápida.
        </p>
        <motion.span
          whileTap={reduceMotion ? undefined : { scale: 0.96 }}
          className="mt-3 inline-flex w-fit"
        >
          <Link
            href="/categorias"
            className="inline-flex h-10 items-center rounded-pill bg-accent-500 px-5 text-sm font-bold transition-colors hover:bg-accent-600"
          >
            Ver ofertas
          </Link>
        </motion.span>
      </div>

      <motion.span
        aria-hidden
        className="relative text-6xl sm:text-7xl"
        animate={reduceMotion ? undefined : { y: [0, -8, 0], rotate: [0, -3, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
      >
        🧺
      </motion.span>
    </motion.section>
  );
}
