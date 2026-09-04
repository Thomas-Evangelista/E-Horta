'use client';

import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useId, useRef } from 'react';
import { Button } from './button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback(() => {
    if (!dialogRef.current) return [];
    return Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
  }, []);

  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => {
        const first = getFocusableElements()[0];
        first?.focus();
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

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-ink-900/40"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            className={`relative w-full rounded-card border border-cream-200 bg-white shadow-lg ${SIZES[size]}`}
          >
            <div className="flex items-center justify-between border-b border-cream-200 px-5 py-4">
              <h2 id={titleId} className="text-base font-bold text-ink-900">{title}</h2>
              <button onClick={onClose} className="rounded-full p-1.5 text-ink-400 hover:bg-cream-100" aria-label="Fechar">
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
            {footer && (
              <div className="flex justify-end gap-2 border-t border-cream-200 px-5 py-4">
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Cancelar
                </Button>
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
