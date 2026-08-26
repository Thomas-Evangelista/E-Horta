'use client';
import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, id, className = '', ...props },
  ref,
) {
  const autoId = useId();
  const textareaId = id ?? autoId;

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={textareaId} className="text-sm font-medium text-ink-600">
        {label}
      </label>
      <textarea
        ref={ref}
        id={textareaId}
        className={`min-h-[100px] rounded-xl border bg-white px-3.5 py-2.5 text-sm text-ink-800 placeholder:text-ink-400 ${
          error ? 'border-red-400' : 'border-cream-300'
        } ${className}`}
        {...props}
      />
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
});
