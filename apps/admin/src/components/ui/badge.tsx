import type { ReactNode } from 'react';

interface BadgeProps {
  tone?: 'accent' | 'leaf' | 'neutral' | 'red' | 'yellow' | 'blue';
  children: ReactNode;
  className?: string;
}

const TONES = {
  accent: 'bg-accent-100 text-accent-700',
  leaf: 'bg-leaf-100 text-leaf-700',
  neutral: 'bg-cream-200 text-ink-600',
  red: 'bg-red-100 text-red-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  blue: 'bg-blue-100 text-blue-600',
} as const;

export function Badge({ tone = 'neutral', className = '', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}
