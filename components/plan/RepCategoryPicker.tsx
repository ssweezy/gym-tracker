'use client';

import { cn } from '@/lib/utils';
import type { RepCategory } from '@/lib/progression';

const OPTIONS: Array<{
  value: RepCategory;
  label: string;
  range: string;
  color: 'crimson' | 'green' | 'gray';
}> = [
  { value: 'strength', label: 'Силовая', range: '5–8', color: 'crimson' },
  { value: 'classic', label: 'Классика', range: '8–12', color: 'green' },
  { value: 'beginner', label: 'Новичок', range: '12–15', color: 'gray' },
];

const palette: Record<'green' | 'crimson' | 'gray', string> = {
  green: 'bg-accent-green/12 text-accent-green ring-1 ring-accent-green/50',
  crimson: 'bg-accent-crimson/12 text-accent-crimson ring-1 ring-accent-crimson/50',
  gray: 'bg-white/[0.06] text-text-secondary ring-1 ring-white/10',
};

const idle: Record<'green' | 'crimson' | 'gray', string> = {
  green: 'bg-white/[0.04] text-text-secondary',
  crimson: 'bg-white/[0.04] text-text-secondary',
  gray: 'bg-white/[0.04] text-text-secondary',
};

interface RepCategoryPickerProps {
  value: RepCategory;
  onChange: (next: RepCategory) => void;
  className?: string;
}

export function RepCategoryPicker({ value, onChange, className }: RepCategoryPickerProps) {
  return (
    <div className={cn('grid grid-cols-3 gap-2', className)}>
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex flex-col items-center rounded-2xl px-2 py-3 text-[12px] font-semibold transition-all active:scale-[0.97]',
              active ? palette[opt.color] : idle[opt.color],
            )}
          >
            <span>{opt.label}</span>
            <span className="mt-0.5 text-[11px] font-medium tabular-nums opacity-80">
              {opt.range}
            </span>
          </button>
        );
      })}
    </div>
  );
}
