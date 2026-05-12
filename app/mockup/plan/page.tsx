'use client';

import { motion } from 'framer-motion';
import { ChevronRight, Plus, Flame, Timer } from 'lucide-react';
import { Stagger, Reveal } from '@/components/mockup/Stagger';
import { cn } from '@/lib/utils';

interface DayCell {
  short: string;
  num: number;
  state: 'rest' | 'workout' | 'today' | 'future';
  workoutNum?: number;
  title?: string;
  muscles?: string[];
}

const week: DayCell[] = [
  { short: 'Пн', num: 11, state: 'today', workoutNum: 1, title: 'Грудь · Трицепс', muscles: ['Грудь', 'Трицепс', 'Плечи'] },
  { short: 'Вт', num: 12, state: 'rest' },
  { short: 'Ср', num: 13, state: 'workout', workoutNum: 2, title: 'Спина · Бицепс', muscles: ['Спина', 'Бицепс'] },
  { short: 'Чт', num: 14, state: 'rest' },
  { short: 'Пт', num: 15, state: 'workout', workoutNum: 3, title: 'Ноги', muscles: ['Квадрицепс', 'Ягодицы', 'Икры'] },
  { short: 'Сб', num: 16, state: 'rest' },
  { short: 'Вс', num: 17, state: 'rest' },
];

type VolumeStatus = 'low' | 'optimal' | 'high';

interface MuscleVolume {
  group: string;
  sets: number;
  status: VolumeStatus;
}

const volumes: MuscleVolume[] = [
  { group: 'Грудь', sets: 8, status: 'optimal' },
  { group: 'Спина', sets: 10, status: 'optimal' },
  { group: 'Квадрицепс', sets: 6, status: 'optimal' },
  { group: 'Ягодицы', sets: 6, status: 'optimal' },
  { group: 'Плечи', sets: 4, status: 'optimal' },
  { group: 'Бицепс', sets: 7, status: 'optimal' },
  { group: 'Трицепс', sets: 11, status: 'high' },
  { group: 'Икры', sets: 2, status: 'low' },
];

const statusColor: Record<VolumeStatus, string> = {
  low: '#6E6E73',
  optimal: '#34C759',
  high: '#FF9500',
};

const statusTextColor: Record<VolumeStatus, string> = {
  low: 'text-text-tertiary',
  optimal: 'text-accent-green',
  high: 'text-accent-warning',
};

const statusLabel: Record<VolumeStatus, string> = {
  low: 'мало',
  optimal: 'норма',
  high: 'много',
};

function DayCellView({ d, index }: { d: DayCell; index: number }) {
  const isToday = d.state === 'today';
  const isWorkout = d.state === 'workout';

  return (
    <motion.button
      className="flex flex-col items-center gap-2 rounded-2xl py-1.5 transition-colors hover:bg-white/[0.02]"
      whileTap={{ scale: 0.96 }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1], delay: 0.04 + index * 0.03 }}
    >
      <span
        className={cn(
          'text-[10px] font-semibold uppercase tracking-[0.08em]',
          isToday ? 'text-accent-crimson' : 'text-text-tertiary',
        )}
      >
        {d.short}
      </span>
      <div
        className={cn(
          'relative flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-semibold tabular-nums transition-colors',
          isToday && 'bg-accent-crimson text-white',
          isWorkout && 'border border-accent-green/40 text-text-primary',
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
        {d.num}
      </div>
      <span
        className={cn(
          'h-1 w-1 rounded-full',
          isToday && 'bg-accent-crimson',
          isWorkout && 'bg-accent-green',
          !isToday && !isWorkout && 'bg-transparent',
        )}
      />
    </motion.button>
  );
}

export default function PlanMockup() {
  const todayWorkout = week.find((d) => d.state === 'today');
  const totalWorkouts = week.filter((d) => d.state === 'today' || d.state === 'workout').length;
  const totalSets = volumes.reduce((s, v) => s + v.sets, 0);

  return (
    <Stagger className="px-5 pt-9">
      <Reveal className="flex items-baseline justify-between">
        <div className="text-[13px] font-medium text-text-tertiary">11–17 мая · Май &apos;26</div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary tabular-nums">
          Неделя 19
        </div>
      </Reveal>

      <Reveal className="mt-2">
        <h1
          className="text-[34px] font-bold leading-[1.05] tracking-[-0.022em]"
          style={{ fontFeatureSettings: '"ss01"' }}
        >
          На этой неделе
        </h1>
      </Reveal>

      {/* Week strip card */}
      <Reveal className="mt-6">
        <div
          className="overflow-hidden rounded-[26px] p-3"
          style={{
            background: 'linear-gradient(180deg, #131316 0%, #0B0B0E 100%)',
          }}
        >
          <div className="grid grid-cols-7 gap-0.5">
            {week.map((d, i) => (
              <DayCellView key={d.num} d={d} index={i} />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-3 text-[11px] text-text-tertiary tabular-nums">
            <span>{totalWorkouts} тренировки</span>
            <span>{totalSets} подходов</span>
            <span>~{totalWorkouts * 50} мин</span>
          </div>
        </div>
      </Reveal>

      {/* Today callout */}
      {todayWorkout && (
        <Reveal className="mt-3">
          <button
            className="block w-full overflow-hidden rounded-[22px] p-5 text-left active:scale-[0.995] transition-transform"
            style={{
              background:
                'radial-gradient(110% 90% at 100% 0%, rgba(255,45,85,0.12) 0%, rgba(255,45,85,0) 60%), #131316',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-crimson" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-crimson">
                    Сегодня · Тренировка {todayWorkout.workoutNum}
                  </span>
                </div>
                <h2 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight">
                  {todayWorkout.title}
                </h2>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {todayWorkout.muscles?.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-text-secondary"
                    >
                      {m}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3 text-[12px] text-text-tertiary tabular-nums">
                  <span className="inline-flex items-center gap-1.5">
                    <Flame size={13} className="text-accent-crimson" /> 18 подходов
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Timer size={13} /> ~50 мин
                  </span>
                </div>
              </div>
              <ChevronRight size={20} className="shrink-0 text-text-tertiary" />
            </div>
          </button>
        </Reveal>
      )}

      {/* Volume header */}
      <Reveal className="mt-7 flex items-baseline justify-between">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          Объём за неделю
        </h3>
        <span className="text-[12px] text-text-tertiary">подходов на группу</span>
      </Reveal>

      {/* Volume list card */}
      <Reveal className="mt-3">
        <div className="overflow-hidden rounded-[22px] bg-bg-elevated">
          <ul className="divide-y divide-white/[0.04]">
            {volumes.map((v, i) => {
              const fillPct = Math.min(100, (v.sets / 12) * 100);
              return (
                <motion.li
                  key={v.group}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1], delay: 0.05 + i * 0.04 }}
                  className="flex items-center gap-3.5 px-4 py-3.5"
                >
                  <div className="w-[88px] text-[14px] font-medium">{v.group}</div>
                  <div className="flex-1">
                    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
                      {/* range markers at 4 and 10 */}
                      <span className="absolute inset-y-0 left-1/3 w-px bg-white/15" />
                      <span className="absolute inset-y-0 left-[83.33%] w-px bg-white/15" />
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ backgroundColor: statusColor[v.status] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${fillPct}%` }}
                        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 + i * 0.03 }}
                      />
                    </div>
                  </div>
                  <div className="flex w-[68px] items-baseline justify-end gap-1.5 tabular-nums">
                    <span className={cn('text-[18px] font-semibold leading-none', statusTextColor[v.status])}>
                      {v.sets}
                    </span>
                    <span className={cn('text-[10px] font-medium uppercase tracking-wide', statusTextColor[v.status])}>
                      {statusLabel[v.status]}
                    </span>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </Reveal>

      {/* Legend */}
      <Reveal className="mt-3 flex items-center gap-4 px-1 text-[11px] text-text-tertiary">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary" />&lt; 4
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />4–10
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-warning" />&gt; 10
        </span>
      </Reveal>

      {/* Add day */}
      <Reveal className="mt-5 pb-2">
        <button className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.08] text-[14px] font-semibold text-text-secondary hover:bg-white/[0.02] transition-colors">
          <Plus size={16} />
          Добавить тренировочный день
        </button>
      </Reveal>
    </Stagger>
  );
}
