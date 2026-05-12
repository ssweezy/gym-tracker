'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface FilterChip {
  key: string;
  label: string;
  count: number;
}

export function MuscleFilterChips({ chips }: { chips: FilterChip[] }) {
  const sp = useSearchParams();
  const current = sp.get('muscle') ?? '';

  function buildHref(key: string): string {
    const params = new URLSearchParams(sp.toString());
    if (key === '') params.delete('muscle');
    else params.set('muscle', key);
    const qs = params.toString();
    return qs ? `?${qs}` : '?';
  }

  return (
    <div className="overflow-x-auto px-5 pb-1 [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-2">
        {chips.map((c) => {
          const active = c.key === current;
          return (
            <Link
              key={c.key || 'all'}
              href={buildHref(c.key)}
              scroll={false}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-all',
                active
                  ? 'bg-text-primary text-bg'
                  : 'bg-white/[0.05] text-text-secondary hover:bg-white/[0.08]',
              )}
            >
              {c.label}
              <span
                className={cn(
                  'ml-1.5 tabular-nums',
                  active ? 'text-bg/55' : 'text-text-tertiary',
                )}
              >
                {c.count}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
