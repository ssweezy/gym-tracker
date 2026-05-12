'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { setDayWorkout } from '@/server/plan-actions';
import { cn } from '@/lib/utils';

const WEEKDAY_SHORT = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WEEKDAY_DEFAULT_TITLE: Record<number, string> = {
  1: 'Тренировка · Пн',
  2: 'Тренировка · Вт',
  3: 'Тренировка · Ср',
  4: 'Тренировка · Чт',
  5: 'Тренировка · Пт',
  6: 'Тренировка · Сб',
  7: 'Тренировка · Вс',
};

export interface WeekTimelineDay {
  id: string;
  weekday: number;
  is_rest: boolean;
  title: string | null;
  exerciseCount: number;
}

interface WeekTimelineProps {
  days: WeekTimelineDay[];
  todayWeekday: number; // 1..7
  weekStartDate: Date; // Monday
}

export function WeekTimeline({
  days,
  todayWeekday,
  weekStartDate,
}: WeekTimelineProps) {
  const router = useRouter();
  const [openDayId, setOpenDayId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const byWeekday = new Map<number, WeekTimelineDay>();
  for (const d of days) byWeekday.set(d.weekday, d);

  const openDay = openDayId
    ? days.find((d) => d.id === openDayId) ?? null
    : null;

  function activateWorkout(day: WeekTimelineDay) {
    const title = WEEKDAY_DEFAULT_TITLE[day.weekday] ?? 'Тренировка';
    startTransition(async () => {
      const res = await setDayWorkout(day.id, title);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success('Тренировочный день создан');
      setOpenDayId(null);
      router.push(`/plan/edit/${day.id}`);
    });
  }

  function goToEdit(day: WeekTimelineDay) {
    setOpenDayId(null);
    router.push(`/plan/edit/${day.id}`);
  }

  return (
    <div
      className="overflow-hidden rounded-[26px] p-3"
      style={{
        background: 'linear-gradient(180deg, #131316 0%, #0B0B0E 100%)',
      }}
    >
      <div className="grid grid-cols-7 gap-0.5">
        {[1, 2, 3, 4, 5, 6, 7].map((wd, idx) => {
          const day = byWeekday.get(wd);
          const date = new Date(weekStartDate);
          date.setDate(weekStartDate.getDate() + (wd - 1));
          const isToday = wd === todayWeekday;
          const isWorkout = !!day && !day.is_rest;
          const isOpen = openDayId !== null && openDayId === day?.id;

          return (
            <button
              key={wd}
              type="button"
              onClick={() => {
                if (!day) return;
                if (isWorkout) {
                  router.push(`/plan/edit/${day.id}`);
                } else {
                  setOpenDayId(isOpen ? null : day.id);
                }
              }}
              className={cn(
                'rounded-2xl transition-colors hover:bg-white/[0.02]',
                isOpen && 'bg-white/[0.04]',
              )}
            >
              <motion.div
                className="flex flex-col items-center gap-2 rounded-2xl py-1.5"
                whileTap={{ scale: 0.96 }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.36,
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.04 + idx * 0.03,
                }}
              >
                <span
                  className={cn(
                    'text-[10px] font-semibold uppercase tracking-[0.08em]',
                    isToday ? 'text-accent-crimson' : 'text-text-tertiary',
                  )}
                >
                  {WEEKDAY_SHORT[wd]}
                </span>
                <div
                  className={cn(
                    'relative flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-semibold tabular-nums transition-colors',
                    isToday && 'bg-accent-crimson text-white',
                    !isToday &&
                      isWorkout &&
                      'border border-accent-green/40 text-text-primary',
                    !isToday && !isWorkout && 'text-text-tertiary',
                  )}
                  style={
                    isToday
                      ? { boxShadow: '0 6px 18px -6px rgba(255,45,85,0.55)' }
                      : isWorkout
                        ? { boxShadow: 'inset 0 0 0 1px rgba(52,199,89,0.18)' }
                        : undefined
                  }
                >
                  {date.getDate()}
                </div>
                <span
                  className={cn(
                    'h-1 w-1 rounded-full',
                    isToday && 'bg-accent-crimson',
                    !isToday && isWorkout && 'bg-accent-green',
                    !isToday && !isWorkout && 'bg-transparent',
                  )}
                />
              </motion.div>
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {openDay && (
          <motion.div
            key={openDay.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-2xl bg-white/[0.04] p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                {WEEKDAY_SHORT[openDay.weekday]} · день отдыха
              </div>
              <div className="mt-2 flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => activateWorkout(openDay)}
                  disabled={isPending}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl text-[13px] font-semibold text-black active:scale-[0.985] disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(180deg, #3DD668 0%, #2BB955 100%)',
                  }}
                >
                  <Plus size={14} strokeWidth={2.6} />
                  Создать тренировочный день
                </button>
                <button
                  type="button"
                  onClick={() => goToEdit(openDay)}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-white/[0.05] text-[13px] font-semibold text-text-primary active:scale-[0.985]"
                >
                  <Pencil size={13} strokeWidth={2.4} />
                  Изменить упражнения
                </button>
                <button
                  type="button"
                  onClick={() => setOpenDayId(null)}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl text-[12.5px] font-medium text-text-tertiary active:scale-[0.985]"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-3 text-[11px] text-text-tertiary tabular-nums">
        <span>{days.filter((d) => !d.is_rest).length} тренировки</span>
        <span>
          {days.reduce((s, d) => s + (d.is_rest ? 0 : d.exerciseCount), 0)} упражнений
        </span>
        <span>~{days.filter((d) => !d.is_rest).length * 50} мин</span>
      </div>
    </div>
  );
}
