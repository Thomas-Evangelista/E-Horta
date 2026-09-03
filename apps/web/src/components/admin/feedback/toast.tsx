'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

type Tone = 'success' | 'error' | 'info';

const TONE_STYLES: Record<Tone, string> = {
  success: 'bg-leaf-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-ink-800 text-white',
};

type ToastItem = { id: number; tone: Tone; message: string };

type ToastCtx = {
  toast: (tone: Tone, message: string) => void;
};

const ToastContext = createContext<ToastCtx>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((tone: Tone, message: string) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev.slice(-2), { id, tone, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-20 left-1/2 z-toast flex -translate-x-1/2 flex-col gap-2 md:bottom-6">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className={`flex items-center gap-2 rounded-pill px-4 py-2.5 text-sm font-medium shadow-lg ${TONE_STYLES[t.tone]}`}
              role="status"
              aria-live="polite"
            >
              {t.message}
              <button
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="ml-1 rounded-full p-0.5 hover:bg-white/20"
                aria-label="Fechar"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
