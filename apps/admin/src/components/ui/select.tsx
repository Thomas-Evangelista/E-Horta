'use client';
import { forwardRef, useId, type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, options, placeholder, id, className = '', ...props },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-ink-600">
        {label}
      </label>
      <select
        ref={ref}
        id={selectId}
        className={`h-11 rounded-xl border bg-white px-3.5 text-sm text-ink-800 ${
          error ? 'border-red-400' : 'border-cream-300'
        } ${className}`}
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
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
});
