'use client';

import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DISMISS_KEY = 'e-horta-install-dismissed';
const VISIT_KEY = 'e-horta-visits';

function getVisitCount(): number {
  try {
    return Number.parseInt(localStorage.getItem(VISIT_KEY) ?? '0', 10);
  } catch {
    return 0;
  }
}

function incrementVisitCount(): void {
  try {
    localStorage.setItem(VISIT_KEY, String(getVisitCount() + 1));
  } catch {
    /* noop */
  }
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === 'true';
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, 'true');
  } catch {
    /* noop */
  }
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (wasDismissed()) return;

    incrementVisitCount();
    const visits = getVisitCount();
    if (visits < 3) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setVisible(false);
    setDeferredPrompt(null);
    markDismissed();
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          className="fixed bottom-24 left-4 right-4 z-[90] mx-auto max-w-sm rounded-xl border border-cream-200 bg-white p-4 shadow-card md:bottom-20"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-leaf-50 text-leaf-600">
              <Download size={20} aria-hidden />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-ink-900">Instalar E-Horta</p>
              <p className="mt-0.5 text-xs text-ink-500">Acesse mais rápido pela tela inicial.</p>
            </div>
            <button
              onClick={handleDismiss}
              className="shrink-0 rounded p-1 text-ink-400 hover:text-ink-600"
              aria-label="Dispensar"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={handleDismiss} className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-500 hover:bg-cream-100">
              Agora não
            </button>
            <button
              onClick={handleInstall}
              className="rounded-lg bg-leaf-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-leaf-700"
            >
              Instalar
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
