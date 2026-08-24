'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <span className="text-5xl" aria-hidden>
        🥀
      </span>
      <h1 className="text-xl font-bold text-ink-900">Algo deu errado</h1>
      <p className="max-w-xs text-sm text-ink-500">
        Enfrentamos um problema inesperado. Tente novamente em instantes.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 inline-flex h-11 items-center rounded-pill bg-accent-500 px-6 text-sm font-bold text-white hover:bg-accent-600"
      >
        Tentar novamente
      </button>
    </div>
  );
}
