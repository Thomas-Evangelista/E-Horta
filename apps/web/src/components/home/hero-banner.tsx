import Link from 'next/link';

export function HeroBanner() {
  return (
    <section
      aria-label="Destaque da semana"
      className="flex items-center justify-between overflow-hidden rounded-card bg-leaf-600 p-5 text-white sm:p-7"
    >
      <div className="max-w-[70%]">
        <p className="text-xs font-semibold uppercase tracking-wider text-leaf-100">
          Fresquinho da horta
        </p>
        <h2 className="mt-1 text-xl font-extrabold leading-tight sm:text-2xl">
          Do campo pra sua casa em até 2 dias
        </h2>
        <p className="mt-1.5 hidden text-sm text-leaf-100 sm:block">
          Hortaliças, frutas e legumes selecionados com entrega rápida.
        </p>
        <Link
          href="/categorias"
          className="mt-3 inline-flex h-10 items-center rounded-pill bg-accent-500 px-5 text-sm font-bold transition-colors hover:bg-accent-600"
        >
          Ver ofertas
        </Link>
      </div>
      <span className="text-6xl sm:text-7xl" aria-hidden>
        🧺
      </span>
    </section>
  );
}
