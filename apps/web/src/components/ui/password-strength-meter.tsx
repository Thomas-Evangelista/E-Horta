'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { evaluatePasswordStrength } from '@/lib/password-strength';
import type { PasswordStrengthResult } from '@/lib/password-strength';

export function PasswordStrengthMeter({ password }: { password: string }) {
  const result: PasswordStrengthResult = useMemo(
    () => evaluatePasswordStrength(password),
    [password],
  );
  const reduceMotion = useReducedMotion();

  if (result.strength === 'empty') return null;

  return (
    <div className="flex flex-col gap-1.5" aria-live="polite">
      <div className="flex items-center gap-2" role="status" aria-label={result.aria}>
        <div className="flex flex-1 gap-1">
          {[1, 2, 3, 4].map((segment) => {
            const filled = result.score >= segment;
            const isCurrent = filled && result.score === segment;
            return (
              <motion.div
                key={segment}
                aria-hidden
                initial={reduceMotion ? false : { scaleX: 0.6, opacity: 0.5 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 0.18 }}
                className="h-1.5 flex-1 origin-left rounded-full"
                style={{ backgroundColor: filled ? result.color : '#ece5d2' }}
                data-current={isCurrent || undefined}
              />
            );
          })}
        </div>
        <span className="w-12 text-right text-xs font-bold" style={{ color: result.color }}>
          {result.label}
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {result.requirements.map((req) => (
          <li
            key={req.text}
            className={`flex items-center gap-1 text-[11px] ${req.met ? 'text-leaf-700' : 'text-ink-400'}`}
          >
            <span aria-hidden>{req.met ? '✓' : '○'}</span>
            {req.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
