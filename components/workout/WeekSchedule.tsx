import Link from 'next/link';
import { Pencil } from 'lucide-react';
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

const MAX_LISTED = 6;

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
 * Weekly training overview: every TRAINING day (rest days excluded) in
 * weekday order with a short list of its exercises, each card tappable to
 * edit that day's workout.
 */
export function WeekSchedule({ days }: { days: ScheduleDay[] }) {
  const training = [...days]
    .filter(
      (d) =>
        d.weekday >= 1 &&
        d.weekday <= 7 &&
        !d.is_rest &&
        d.exercises.length > 0,
    )
    .sort((a, b) => a.weekday - b.weekday);

  if (training.length === 0) return null;

  return (
    <Reveal className="mt-7">
      <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
        Тренировки недели
      </h3>

      <div className="mt-3 space-y-2">
        {training.map((d) => {
          const shown = d.exercises.slice(0, MAX_LISTED);
          const rest = d.exercises.length - shown.length;
          return (
            <Link
              key={d.id}
              href={`/plan/edit/${d.id}`}
              className="block overflow-hidden rounded-2xl bg-bg-elevated px-4 py-3.5 active:scale-[0.99] transition-transform"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                      {SCHEMA_WEEKDAY[d.weekday]}
                    </span>
                    <span className="text-[11px] text-text-tertiary tabular-nums">
                      {d.exercises.length} упр.
                    </span>
                  </div>
                  <h4 className="mt-1 truncate text-[15px] font-semibold tracking-tight">
                    {d.title || 'Тренировка'}
                  </h4>
                  <ul className="mt-2 space-y-1">
                    {shown.map((e, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-[12.5px] text-text-secondary"
                      >
                        <span className="h-1 w-1 shrink-0 rounded-full bg-accent-crimson" />
                        <span className="flex-1 truncate">
                          {e.exercise.name}
                        </span>
                        <span className="shrink-0 text-[11px] text-text-tertiary tabular-nums">
                          {e.target_sets}×
                        </span>
                      </li>
                    ))}
                    {rest > 0 && (
                      <li className="pl-3 text-[11.5px] text-text-tertiary">
                        ещё {rest}
                      </li>
                    )}
                  </ul>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-text-secondary">
                  <Pencil size={14} strokeWidth={2.2} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </Reveal>
  );
}
