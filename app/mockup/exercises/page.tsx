'use client';

import { motion } from 'framer-motion';
import { Search, ChevronRight, Plus, Sparkles } from 'lucide-react';
import { Stagger, Reveal } from '@/components/mockup/Stagger';
import { cn } from '@/lib/utils';

interface MockExerciseCard {
  id: string;
  name: string;
  muscles: string[];
  isSystem: boolean;
  inPlan: boolean;
  letter: string;
  hue: number;
}

const filters = [
  { label: 'Все', count: 25 },
  { label: 'Грудь', count: 5 },
  { label: 'Спина', count: 4 },
  { label: 'Ноги', count: 7 },
  { label: 'Руки', count: 4 },
  { label: 'Плечи', count: 3 },
  { label: 'Пресс', count: 2 },
];

const exercises: MockExerciseCard[] = [
  { id: '1', name: 'Жим лёжа', muscles: ['Грудь', 'Трицепс', 'Плечи'], isSystem: true, inPlan: true, letter: 'Ж', hue: 348 },
  { id: '2', name: 'Присед со штангой', muscles: ['Квадрицепс', 'Ягодицы'], isSystem: true, inPlan: true, letter: 'П', hue: 142 },
  { id: '3', name: 'Становая тяга', muscles: ['Спина', 'Ягодицы', 'Бицепс бедра'], isSystem: true, inPlan: false, letter: 'С', hue: 28 },
  { id: '4', name: 'Жим стоя со штангой', muscles: ['Плечи', 'Трицепс'], isSystem: true, inPlan: false, letter: 'Ж', hue: 210 },
  { id: '5', name: 'Тяга штанги в наклоне', muscles: ['Спина', 'Бицепс'], isSystem: true, inPlan: true, letter: 'Т', hue: 280 },
  { id: '6', name: 'Подтягивания', muscles: ['Спина', 'Бицепс'], isSystem: true, inPlan: false, letter: 'П', hue: 200 },
  { id: '7', name: 'Отжимания на брусьях', muscles: ['Грудь', 'Трицепс'], isSystem: true, inPlan: true, letter: 'О', hue: 348 },
  { id: '8', name: 'Сгибания на бицепс', muscles: ['Бицепс'], isSystem: true, inPlan: true, letter: 'С', hue: 260 },
  { id: '9', name: 'Французский жим', muscles: ['Трицепс'], isSystem: true, inPlan: true, letter: 'Ф', hue: 195 },
  { id: '10', name: 'Моя протяжка', muscles: ['Плечи', 'Трапеции'], isSystem: false, inPlan: false, letter: 'М', hue: 12 },
];

const featured = exercises.filter((e) => e.inPlan).slice(0, 4);

function Avatar({ ex, size = 40 }: { ex: MockExerciseCard; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-2xl font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(135deg, hsla(${ex.hue}, 70%, 55%, 0.18) 0%, hsla(${ex.hue + 20}, 80%, 45%, 0.32) 100%)`,
        color: `hsl(${ex.hue}, 75%, 70%)`,
        boxShadow: `inset 0 0 0 1px hsla(${ex.hue}, 70%, 60%, 0.16)`,
      }}
    >
      {ex.isSystem ? ex.letter : <Sparkles size={size * 0.4} />}
    </div>
  );
}

export default function ExercisesMockup() {
  return (
    <Stagger className="pt-9">
      <Reveal className="px-5">
        <div className="flex items-baseline justify-between">
          <div className="text-[13px] font-medium text-text-tertiary tabular-nums">
            25 упражнений · 9 в плане
          </div>
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <h1
            className="text-[34px] font-bold leading-[1.05] tracking-[-0.022em]"
            style={{ fontFeatureSettings: '"ss01"' }}
          >
            Тренажёры
          </h1>
          <button
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-black active:scale-95 transition-transform"
            aria-label="Создать упражнение"
            style={{
              background: 'linear-gradient(180deg, #3DD668 0%, #2BB955 100%)',
              boxShadow: '0 6px 18px -6px rgba(52,199,89,0.55)',
            }}
          >
            <Plus size={20} strokeWidth={2.6} />
          </button>
        </div>
      </Reveal>

      {/* Search */}
      <Reveal className="mt-5 px-5">
        <div className="flex h-11 items-center gap-2.5 rounded-2xl bg-white/[0.05] px-3.5">
          <Search size={16} className="text-text-tertiary" strokeWidth={2.2} />
          <span className="text-[14px] text-text-tertiary">Поиск упражнений</span>
        </div>
      </Reveal>

      {/* Filters */}
      <Reveal className="mt-4">
        <div className="overflow-x-auto px-5 pb-1 [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-2">
            {filters.map((f, i) => (
              <button
                key={f.label}
                className={cn(
                  'shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-all',
                  i === 0
                    ? 'bg-text-primary text-bg'
                    : 'bg-white/[0.05] text-text-secondary hover:bg-white/[0.08]',
                )}
              >
                {f.label}
                <span className={cn('ml-1.5 tabular-nums', i === 0 ? 'text-bg/55' : 'text-text-tertiary')}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Featured (in plan) */}
      <Reveal className="mt-7">
        <div className="flex items-baseline justify-between px-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
            В твоём плане
          </h2>
          <span className="text-[12px] text-text-tertiary">{featured.length} упражнений</span>
        </div>
        <div className="mt-3 overflow-x-auto pl-5 pr-3 pb-2 [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-2.5">
            {featured.map((ex) => (
              <button
                key={ex.id}
                className="w-[180px] shrink-0 overflow-hidden rounded-[22px] bg-bg-elevated p-4 text-left active:scale-[0.985] transition-transform"
              >
                <div className="flex items-start justify-between">
                  <Avatar ex={ex} size={44} />
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
                </div>
                <h3 className="mt-3 text-[15px] font-semibold leading-tight tracking-tight line-clamp-2 min-h-[2.5em]">
                  {ex.name}
                </h3>
                <div className="mt-2 text-[11px] text-text-tertiary truncate">
                  {ex.muscles.join(' · ')}
                </div>
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      {/* All exercises */}
      <Reveal className="mt-5 px-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
            Все упражнения
          </h2>
          <span className="text-[12px] text-text-tertiary tabular-nums">А–Я</span>
        </div>
      </Reveal>

      <Reveal className="mt-3 px-5 pb-2">
        <div className="overflow-hidden rounded-[22px] bg-bg-elevated">
          <ul className="divide-y divide-white/[0.04]">
            {exercises.map((ex, i) => (
              <motion.li
                key={ex.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: 0.04 + i * 0.025 }}
              >
                <button className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-white/[0.03] transition-colors">
                  <Avatar ex={ex} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[15px] font-semibold leading-tight tracking-tight truncate">
                        {ex.name}
                      </h3>
                      {ex.inPlan && (
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-green"
                          aria-label="В активном плане"
                        />
                      )}
                      {!ex.isSystem && (
                        <span className="rounded-full bg-accent-crimson/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-accent-crimson">
                          Моё
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-text-tertiary truncate">
                      {ex.muscles.join(' · ')}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-text-tertiary shrink-0" />
                </button>
              </motion.li>
            ))}
          </ul>
        </div>
      </Reveal>
    </Stagger>
  );
}
