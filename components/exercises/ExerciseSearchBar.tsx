'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Search, X } from 'lucide-react';

export function ExerciseSearchBar({ initial = '' }: { initial?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [value, setValue] = useState(initial);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(sp.toString());
      if (value.trim()) params.set('q', value.trim());
      else params.delete('q');
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    }, 220);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="flex h-11 items-center gap-2.5 rounded-2xl bg-white/[0.05] px-3.5">
      <Search size={16} className="text-text-tertiary" strokeWidth={2.2} />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Поиск упражнений"
        className="flex-1 bg-transparent text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
      />
      {value && (
        <button
          onClick={() => setValue('')}
          aria-label="Очистить"
          className="text-text-tertiary"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
