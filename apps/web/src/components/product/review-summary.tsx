'use client';

import { Star } from 'lucide-react';
import type { ReviewSummaryDTO } from '@/types/api';

export function ReviewSummary({ summary }: { summary: ReviewSummaryDTO }) {
  if (summary.total === 0) return null;

  const bars = [5, 4, 3, 2, 1].map((star) => {
    const count = summary.distribution[star as 1 | 2 | 3 | 4 | 5] ?? 0;
    const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;
    return { star, count, pct };
  });

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-cream-200 bg-white p-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex shrink-0 flex-col items-center gap-1 sm:w-28">
        <span className="text-4xl font-extrabold text-ink-900">
          {summary.average % 1 === 0 ? summary.average.toFixed(0) : summary.average.toFixed(1)}
        </span>
        <span className="flex items-center gap-0.5" aria-label={`Nota média ${summary.average} de 5`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={16}
              aria-hidden
              className={star <= Math.round(summary.average) ? 'fill-accent-500 text-accent-500' : 'text-cream-300'}
            />
          ))}
        </span>
        <span className="text-xs text-ink-400">
          {summary.total} {summary.total === 1 ? 'avaliação' : 'avaliações'}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        {bars.map(({ star, count, pct }) => (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="flex w-6 shrink-0 items-center gap-0.5 text-ink-500">
              {star} <Star size={11} aria-hidden className="fill-amber-400 text-amber-400" />
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-100">
              <div className="h-full rounded-full bg-accent-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-8 shrink-0 text-right tabular-nums text-ink-400">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
