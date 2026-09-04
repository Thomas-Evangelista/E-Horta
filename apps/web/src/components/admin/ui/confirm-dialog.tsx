'use client';

import { AlertTriangle, Info, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useId, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './button';

type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  variant?: ConfirmVariant;
  confirmLabel?: string;
  loading?: boolean;
}

const VARIANT_CONFIG: Record<ConfirmVariant, { icon: typeof Trash2; iconBg: string; iconColor: string; buttonClass: string }> = {
  danger: { icon: Trash2, iconBg: 'bg-red-50', iconColor: 'text-red-600', buttonClass: 'bg-red-600 hover:bg-red-700' },
  warning: { icon: AlertTriangle, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', buttonClass: 'bg-amber-600 hover:bg-amber-700' },
  info: { icon: Info, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', buttonClass: 'bg-leaf-600 hover:bg-leaf-700' },
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  variant = 'danger',
  confirmLabel = 'Confirmar',
  loading = false,
}: ConfirmDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback(() => {
    if (!dialogRef.current) return [];
    return Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
  }, []);

  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => {
        const els = getFocusableElements();
        els[els.length - 1]?.focus();
      });
    } else {
      previousFocus.current?.focus();
    }
  }, [open, getFocusableElements]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, getFocusableElements]);

  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-ink-900/50"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={`${titleId}-desc`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-sm rounded-card border border-cream-200 bg-white p-6 shadow-lg"
          >
            <div className="flex flex-col items-center text-center">
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${config.iconBg}`}>
                <Icon size={24} className={config.iconColor} aria-hidden />
              </div>
              <h2 id={titleId} className="text-base font-bold text-ink-900">{title}</h2>
              <p id={`${titleId}-desc`} className="mt-2 text-sm text-ink-500">{message}</p>
            </div>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                size="sm"
                loading={loading}
                className={config.buttonClass}
                onClick={() => { onConfirm(); }}
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
