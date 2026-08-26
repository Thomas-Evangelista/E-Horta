import { AlertTriangle } from 'lucide-react';
import { Button } from './button';

export function EmptyState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertTriangle className="mb-3 h-10 w-10 text-ink-400" />
      <p className="text-sm text-ink-500">{message}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry} className="mt-3">
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
