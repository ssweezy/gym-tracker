'use client';

import { motion } from 'framer-motion';
import { Check, Timer, Flame, ChevronRight, Sparkles, Pause } from 'lucide-react';
import { ActivityRings } from '@/components/mockup/ActivityRings';
import { Stagger, Reveal } from '@/components/mockup/Stagger';
import { cn } from '@/lib/utils';

type ExerciseState = 'done' | 'active' | 'pending';

interface MockExercise {
  id: string;
  name: string;
  category: 'strength' | 'classic' | 'beginner';
  range: string;
  totalSets: number;
  doneSets: number;
  lastWeight?: number;
  lastReps?: number;
  suggestion?: { weight: number; reps: number; hint: string };
  state: ExerciseState;
}

const workout = {
  title: 'Грудь · Трицепс',
  muscles: ['Грудь', 'Трицепс', 'Плечи'],
  weekdayLong: 'Понедельник',
  dateLabel: '11 мая',
  totalExercises: 5,
  doneExercises: 2,
  totalSets: 18,
  doneSets: 8,
  durationMin: 24,
  weekDone: 1,
  weekTotal: 3,
  streakDays: 5,
};

const exercises: MockExercise[] = [
  { id: 'press', name: 'Жим лёжа', category: 'classic', range: '8–12', totalSets: 4, doneSets: 4, lastWeight: 62.5, lastReps: 11, state: 'done' },
  { id: 'incline-db', name: 'Жим гантелей на наклонной', category: 'classic', range: '8–12', totalSets: 4, doneSets: 4, lastWeight: 28, lastReps: 10, state: 'done' },
  { id: 'dips', name: 'Отжимания на брусьях', category: 'classic', range: '8–12', totalSets: 4, doneSets: 0, suggestion: { weight: 10, reps: 10, hint: '+1 повторение' }, state: 'active' },
  { id: 'fly', name: 'Разводка гантелей', category: 'beginner', range: '12–15', totalSets: 3, doneSets: 0, state: 'pending' },
  { id: 'pushdown', name: 'Разгибания на блоке', category: 'beginner', range: '12–15', totalSets: 3, doneSets: 0, state: 'pending' },
];

const categoryColor: Record<MockExercise['category'], 'green' | 'crimson' | 'gray'> = {
  strength: 'crimson',
  classic: 'green',
  beginner: 'gray',
};

const categoryLabel: Record<MockExercise['category'], string> = {
  strength: 'Силовая',
  classic: 'Классика',
  beginner: 'Новичок',
};

const COLORS = {
  crimson: '#FF2D55',
  green: '#34C759',
  orange: '#FF9500',
};

const workoutPct = workout.doneSets / workout.totalSets;
const weekPct = workout.weekDone / workout.weekTotal;
const streakPct = workout.streakDays / 10;

const metricPills = [
  { color: COLORS.crimson, label: 'Тренировка', value: `${workout.doneSets}/${workout.totalSets}`, sub: 'подходов' },
  { color: COLORS.green, label: 'Неделя', value: `${workout.weekDone}/${workout.weekTotal}`, sub: 'тренировок' },
  { color: COLORS.orange, label: 'Серия', value: `${workout.streakDays}`, sub: 'дней подряд' },
];

function CategoryBadge({ category, range }: { category: MockExercise['category']; range: string }) {
  const palette: Record<'green' | 'crimson' | 'gray', string> = {
    green: 'bg-accent-green/12 text-accent-green',
    crimson: 'bg-accent-crimson/12 text-accent-crimson',
    gray: 'bg-white/[0.06] text-text-secondary',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tabular-nums',
        palette[categoryColor[category]],
      )}
    >
      {categoryLabel[category]} · {range}
    </span>
  );
}

export default function TodayMockup() {
  return (
    <Stagger className="px-5 pt-9">
      {/* Date strip */}
      <Reveal className="flex items-baseline justify-between">
        <div className="text-[13px] font-medium text-text-tertiary">
          {workout.weekdayLong} · {workout.dateLabel}
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-green/12 px-2.5 py-1 text-[11px] font-semibold text-accent-green">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-green opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-green" />
          </span>
          В процессе
        </div>
      </Reveal>

      {/* Hero title */}
      <Reveal className="mt-2">
        <h1
          className="text-[34px] font-bold leading-[1.05] tracking-[-0.022em]"
          style={{ fontFeatureSettings: '"ss01", "tnum"' }}
        >
          Тренировка
        </h1>
      </Reveal>

      {/* Activity rings card */}
      <Reveal className="mt-6">
        <div
          className="relative overflow-hidden rounded-[26px] p-5"
          style={{
            background:
              'radial-gradient(120% 90% at 100% 0%, rgba(255,45,85,0.10) 0%, rgba(255,45,85,0) 55%), linear-gradient(180deg, #131316 0%, #0B0B0E 100%)',
          }}
        >
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <ActivityRings
                size={148}
                stroke={14}
                gap={3}
                rings={[
                  { color: COLORS.crimson, progress: workoutPct },
                  { color: COLORS.green, progress: weekPct },
                  { color: COLORS.orange, progress: streakPct },
                ]}
              />
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-tertiary">
                  Готово
                </span>
                <span
                  className="text-[28px] font-bold tabular-nums leading-none mt-0.5"
                  style={{ fontFeatureSettings: '"tnum"' }}
                >
                  {Math.round(workoutPct * 100)}%
                </span>
              </div>
            </div>

            <ul className="flex-1 min-w-0 space-y-2.5">
              {metricPills.map((m) => (
                <li key={m.label}>
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: m.color, boxShadow: `0 0 12px 0 ${m.color}55` }}
                    />
                    <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
                      {m.label}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-1.5 pl-[18px]">
                    <span
                      className="text-[22px] font-semibold tabular-nums leading-none tracking-tight"
                      style={{ fontFeatureSettings: '"tnum"' }}
                    >
                      {m.value}
                    </span>
                    <span className="text-[12px] text-text-tertiary">{m.sub}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>

      {/* Workout overview card */}
      <Reveal className="mt-3">
        <button className="block w-full overflow-hidden rounded-[22px] bg-bg-elevated p-5 text-left active:scale-[0.995] transition-transform">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-crimson" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-crimson">
                  Сегодня · Тренировка 1
                </span>
              </div>
              <h2 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight">
                {workout.title}
              </h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {workout.muscles.map((m) => (
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
                  <Flame size={13} className="text-accent-crimson" /> {workout.doneSets}/{workout.totalSets} подходов
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Timer size={13} /> {workout.durationMin} мин
                </span>
              </div>
            </div>
          </div>
        </button>
      </Reveal>

      {/* Exercises section header */}
      <Reveal className="mt-7 flex items-baseline justify-between">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          Упражнения
        </h3>
        <span className="text-[12px] text-text-tertiary tabular-nums">
          {workout.doneExercises} из {workout.totalExercises}
        </span>
      </Reveal>

      {/* Exercises list */}
      <Stagger className="mt-3 space-y-2">
        {exercises.map((ex) => (
          <Reveal key={ex.id}>
            {ex.state === 'done' && (
              <div className="flex items-center gap-3.5 rounded-2xl bg-white/[0.025] px-4 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-green/15">
                  <Check size={16} strokeWidth={2.8} className="text-accent-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text-secondary truncate">
                    {ex.name}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-text-tertiary tabular-nums">
                    {ex.doneSets} подх. · {ex.lastWeight} кг × {ex.lastReps}
                  </div>
                </div>
              </div>
            )}

            {ex.state === 'active' && ex.suggestion && (
              <motion.div
                className="overflow-hidden rounded-[22px] bg-bg-elevated"
                initial={{ scale: 0.985 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CategoryBadge category={ex.category} range={ex.range} />
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-accent-green">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-green opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-green" />
                          </span>
                          Сейчас
                        </span>
                      </div>
                      <h4 className="mt-2.5 text-[19px] font-semibold leading-tight tracking-tight">
                        {ex.name}
                      </h4>
                    </div>
                    <div className="text-right shrink-0 tabular-nums">
                      <div className="text-[18px] font-semibold leading-none">
                        {ex.doneSets}
                        <span className="text-text-tertiary">/{ex.totalSets}</span>
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.1em] text-text-tertiary">
                        подходов
                      </div>
                    </div>
                  </div>

                  <div
                    className="mt-4 rounded-2xl p-4"
                    style={{
                      background:
                        'radial-gradient(90% 120% at 0% 0%, rgba(52,199,89,0.10) 0%, rgba(52,199,89,0) 60%), #141417',
                    }}
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
                        Цель
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-green">
                        <Sparkles size={11} /> {ex.suggestion.hint}
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2 tabular-nums">
                      <span className="text-[40px] font-bold leading-none tracking-tight">
                        {ex.suggestion.weight}
                      </span>
                      <span className="text-base text-text-secondary">кг</span>
                      <span className="mx-1 text-2xl text-text-tertiary">×</span>
                      <span className="text-[40px] font-bold leading-none tracking-tight text-accent-green">
                        {ex.suggestion.reps}
                      </span>
                      <span className="text-base text-text-secondary">повт.</span>
                    </div>
                    <div className="mt-2 text-[11.5px] text-text-tertiary tabular-nums">
                      В прошлый раз: {ex.suggestion.weight} кг × {ex.suggestion.reps - 1}
                    </div>
                  </div>

                  <button
                    className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-black active:scale-[0.985] transition-transform"
                    style={{
                      height: 52,
                      background: 'linear-gradient(180deg, #3DD668 0%, #2BB955 100%)',
                      boxShadow: '0 8px 24px -8px rgba(52,199,89,0.45)',
                    }}
                  >
                    Записать подход
                  </button>
                </div>
              </motion.div>
            )}

            {ex.state === 'pending' && (
              <button className="flex w-full items-center gap-3.5 rounded-2xl bg-white/[0.025] px-4 py-3.5 text-left active:scale-[0.99] transition-transform">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-[12.5px] font-semibold tabular-nums text-text-secondary">
                  {ex.totalSets}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{ex.name}</div>
                  <div className="mt-1">
                    <CategoryBadge category={ex.category} range={ex.range} />
                  </div>
                </div>
                <ChevronRight size={18} className="text-text-tertiary" />
              </button>
            )}
          </Reveal>
        ))}
      </Stagger>

      {/* Pause / finish workout */}
      <Reveal className="mt-6 flex gap-2.5 pb-2">
        <button className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-white/[0.05] text-sm font-semibold text-text-primary active:scale-[0.985] transition-transform">
          <Pause size={15} fill="currentColor" /> Пауза
        </button>
        <button
          className="flex h-12 flex-[1.6] items-center justify-center rounded-2xl text-sm font-semibold text-white active:scale-[0.985] transition-transform"
          style={{
            background: 'linear-gradient(180deg, #FF4E70 0%, #FF2D55 100%)',
            boxShadow: '0 10px 28px -10px rgba(255,45,85,0.55)',
          }}
        >
          Завершить тренировку
        </button>
      </Reveal>
    </Stagger>
  );
}
