import { Loader2 } from 'lucide-react';

export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-cream-200" />
      <div className="h-4 w-72 rounded-lg bg-cream-200" />
      <div className="mt-2 rounded-card border border-cream-200 bg-white">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-cream-100 px-5 py-4">
            <div className="h-4 flex-1 rounded bg-cream-100" />
            <div className="h-4 w-20 rounded bg-cream-100" />
            <div className="h-4 w-16 rounded bg-cream-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
    </div>
  );
}
