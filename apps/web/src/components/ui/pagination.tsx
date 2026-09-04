'use client';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Paginação" className="flex items-center justify-center gap-3 pt-2">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="rounded-pill border border-cream-300 px-4 py-2 text-sm font-medium disabled:opacity-40"
      >
        Anterior
      </button>
      <span aria-current="page" className="text-sm font-semibold text-ink-600">
        Página {page} de {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="rounded-pill border border-cream-300 px-4 py-2 text-sm font-medium disabled:opacity-40"
      >
        Próxima
      </button>
    </nav>
  );
}
