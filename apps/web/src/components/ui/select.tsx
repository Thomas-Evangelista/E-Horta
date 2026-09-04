'use client';

import { forwardRef, type SelectHTMLAttributes } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, placeholder, className = '', ...props },
  ref,
) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-ink-500">{label}</label>}
      <select
        ref={ref}
        className={`h-10 rounded-xl border border-cream-300 bg-white px-3 text-sm text-ink-800 transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500/30 ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
});
