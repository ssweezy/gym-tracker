'use client';

import { Plus } from 'lucide-react';

export interface LoggedSetRow {
  weight_kg: number;
  reps: number;
  completed_at: string | null;
}

interface LoggedSetsListProps {
  sets: LoggedSetRow[];
  onAdd?: () => void;
  /** Hide the "+" trailing button. Used in read-only contexts. */
  hideAdd?: boolean;
}

function hhmm(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Compact per-set list rendered inside an exercise card. */
export function LoggedSetsList({ sets, onAdd, hideAdd }: LoggedSetsListProps) {
  if (sets.length === 0 && hideAdd) return null;
  return (
    <ul className="mt-3 space-y-1.5">
      {sets.map((s, i) => (
        <li
          key={i}
          className="flex items-center justify-between rounded-xl bg-white/[0.025] px-3 py-2 text-[12.5px] tabular-nums"
        >
          <span className="text-text-tertiary">№ {i + 1}</span>
          <span className="flex-1 px-3 text-center font-semibold">
            {s.reps} повт. × {s.weight_kg} кг
          </span>
          <span className="text-[11px] text-text-tertiary">
            {hhmm(s.completed_at)}
          </span>
        </li>
      ))}
      {!hideAdd && onAdd && (
        <li className="flex justify-end pt-0.5">
          <button
            type="button"
            onClick={onAdd}
            aria-label="Добавить подход"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.05] text-text-secondary transition-colors hover:bg-white/[0.08] hover:text-text-primary active:scale-95"
          >
            <Plus size={16} strokeWidth={2.4} />
          </button>
        </li>
      )}
    </ul>
  );
}
