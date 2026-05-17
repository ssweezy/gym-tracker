import Link from 'next/link';
import { ChevronRight, Pencil } from 'lucide-react';
import { Reveal } from '@/components/motion/stagger';

const SCHEMA_WEEKDAY: Record<number, string> = {
  1: 'Понедельник',
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
  6: 'Суббота',
  7: 'Воскресенье',
};

interface DayExercise {
  exercise: { name: string };
  target_sets: number;
}

interface ScheduleDay {
  id: string;
  weekday: number;
  title: string | null;
  is_rest: boolean;
  exercises: DayExercise[];
}

/**
 * Bottom-of-home weekly overview: every plan day in weekday order with its
 * exercises, each tappable to edit that day's workout.
 */
export function WeekSchedule({ days }: { days: ScheduleDay[] }) {
  const sorted = [...days]
    .filter((d) => d.weekday >= 1 && d.weekday <= 7)
    .sort((a, b) => a.weekday - b.weekday);

  if (sorted.length === 0) return null;

  return (
    <Reveal className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          На этой неделе
        </h2>
        <Link
          href="/plan"
          className="text-[12px] font-medium text-text-tertiary active:text-text-secondary"
        >
          Весь план
        </Link>
      </div>

      <div className="mt-3 space-y-2">
        {sorted.map((d) => {
          const rest = d.is_rest || d.exercises.length === 0;
          return (
            <Link
              key={d.id}
              href={`/plan/edit/${d.id}`}
              className="block overflow-hidden rounded-2xl bg-bg-elevated px-4 py-3.5 active:scale-[0.99] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                      {SCHEMA_WEEKDAY[d.weekday]}
                    </span>
                    {rest ? (
                      <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">
                        Отдых
                      </span>
                    ) : (
                      <span className="text-[11px] text-text-tertiary tabular-nums">
                        {d.exercises.length} упр.
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 truncate text-[15px] font-semibold tracking-tight">
                    {rest ? 'День отдыха' : d.title || 'Тренировка'}
                  </h3>
                  {!rest && (
                    <p className="mt-1 truncate text-[12px] text-text-tertiary">
                      {d.exercises.map((e) => e.exercise.name).join(' · ')}
                    </p>
                  )}
                </div>
                {rest ? (
                  <ChevronRight size={16} className="shrink-0 text-text-tertiary" />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-text-secondary">
                    <Pencil size={14} strokeWidth={2.2} />
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </Reveal>
  );
}
