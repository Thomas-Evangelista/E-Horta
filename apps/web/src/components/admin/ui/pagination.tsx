'use client';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="h-9 rounded-lg px-3 text-sm font-medium text-ink-600 hover:bg-cream-100 disabled:opacity-40"
      >
        Anterior
      </button>
      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
        let p: number;
        if (totalPages <= 7) {
          p = i + 1;
        } else if (page <= 4) {
          p = i + 1;
        } else if (page >= totalPages - 3) {
          p = totalPages - 6 + i;
        } else {
          p = page - 3 + i;
        }
        return (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`h-9 w-9 rounded-lg text-sm font-medium transition-colors ${
              p === page ? 'bg-accent-500 text-white' : 'text-ink-600 hover:bg-cream-100'
            }`}
          >
            {p}
          </button>
        );
      })}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="h-9 rounded-lg px-3 text-sm font-medium text-ink-600 hover:bg-cream-100 disabled:opacity-40"
      >
        Próxima
      </button>
    </div>
  );
}
