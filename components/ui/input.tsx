'use client';
import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-12 w-full rounded-xl border border-border bg-bg-elevated px-4 text-text-primary placeholder:text-text-tertiary focus:border-text-secondary focus:outline-none transition-colors',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
