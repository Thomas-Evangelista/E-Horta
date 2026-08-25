'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  toast: (tone: ToastTone, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastTone, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const TONE_STYLES: Record<ToastTone, string> = {
  success: 'border-leaf-500 text-leaf-700',
  error: 'border-red-400 text-red-700',
  info: 'border-accent-400 text-accent-600',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, tone, message }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notificações"
        className="pointer-events-none fixed inset-x-4 bottom-20 z-[100] flex flex-col items-center gap-2 md:bottom-6"
      >
        <AnimatePresence>
          {toasts.map(({ id, tone, message }) => {
            const Icon = ICONS[tone];
            return (
              <motion.div
                key={id}
                role="status"
                layout
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.96 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className={`pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-xl border-l-4 bg-white px-4 py-3 shadow-card ${TONE_STYLES[tone]}`}
              >
                <Icon size={18} aria-hidden />
                <p className="text-sm font-medium">{message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(id)}
                  aria-label="Fechar notificação"
                  className="ml-auto rounded p-1 text-ink-400 transition-colors hover:text-ink-600"
                >
                  <X size={16} aria-hidden />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast deve ser usado dentro de ToastProvider');
  return context;
}
