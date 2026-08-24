import type { HTMLAttributes, ReactNode } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'accent' | 'leaf' | 'neutral';
  children: ReactNode;
}

const TONES = {
  accent: 'bg-accent-100 text-accent-700',
  leaf: 'bg-leaf-100 text-leaf-700',
  neutral: 'bg-cream-200 text-ink-600',
} as const;

export function Badge({ tone = 'neutral', className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
