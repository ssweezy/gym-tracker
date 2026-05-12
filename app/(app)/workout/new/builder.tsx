'use client';

import Image from 'next/image';
import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Layers, Play, Plus, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ExerciseAvatar } from '@/components/exercises/ExerciseAvatar';
import { Stagger, Reveal } from '@/components/motion/stagger';
import { createAdHocSession } from '@/server/sessions';
import type { WorkoutTemplate } from '@/server/plans';
import type { RepCategory } from '@/lib/progression';
import { MUSCLE_LABELS, type MuscleGroup } from '@/lib/volume';
import { exerciseImageUrl } from '@/lib/exercise-images';

const WEEKDAY_SHORT = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface CatalogExercise {
  id: string;
  name: string;
  muscle_groups: string[];
  is_system: boolean;
}

interface Pick {
  exercise_id: string;
  name: string;
  muscle_groups: string[];
  is_system: boolean;
  rep_category: RepCategory;
  target_sets: number;
}

interface AdHocBuilderProps {
  exercises: CatalogExercise[];
  templates: WorkoutTemplate[];
}

const FILTER_ORDER: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
];

const CATEGORY_OPTIONS: Array<{ value: RepCategory; short: string; label: string }> = [
  { value: 'strength', short: 'С', label: 'Силовая' },
  { value: 'classic', short: 'К', label: 'Классика' },
  { value: 'beginner', short: 'Н', label: 'Новичок' },
];

const CATEGORY_PALETTE: Record<RepCategory, { active: string; idle: string }> = {
  strength: {
    active: 'bg-accent-crimson/15 text-accent-crimson ring-1 ring-accent-crimson/40',
    idle: 'bg-white/[0.04] text-text-tertiary',
  },
  classic: {
    active: 'bg-accent-green/15 text-accent-green ring-1 ring-accent-green/40',
    idle: 'bg-white/[0.04] text-text-tertiary',
  },
  beginner: {
    active: 'bg-white/[0.10] text-text-primary ring-1 ring-white/15',
    idle: 'bg-white/[0.04] text-text-tertiary',
  },
};

export function AdHocBuilder({ exercises, templates }: AdHocBuilderProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<string>('');
  // Map preserves insertion order for stable rendering in the "выбрано" tray.
  const [picks, setPicks] = useState<Map<string, Pick>>(new Map());
  const [traysOpen, setTraysOpen] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Build a lookup so templates can be applied even when an exercise
  // is missing from the current catalog page (defensive — listExercises
  // returns everything today, but the join layer is per-exercise).
  const catalogById = useMemo(() => {
    const map = new Map<string, CatalogExercise>();
    for (const ex of exercises) map.set(ex.id, ex);
    return map;
  }, [exercises]);

  function applyTemplate(t: WorkoutTemplate) {
    const next = new Map<string, Pick>();
    let missing = 0;
    for (const ex of t.exercises) {
      const cat = catalogById.get(ex.exercise_id);
      // Prefer catalog data (canonical names + is_system), fall back to
      // the template's snapshot if the exercise isn't in the catalog.
      if (cat) {
        next.set(ex.exercise_id, {
          exercise_id: ex.exercise_id,
          name: cat.name,
          muscle_groups: cat.muscle_groups,
          is_system: cat.is_system,
          rep_category: ex.rep_category,
          target_sets: ex.target_sets,
        });
      } else {
        next.set(ex.exercise_id, {
          exercise_id: ex.exercise_id,
          name: ex.exercise_name,
          muscle_groups: ex.muscle_groups,
          is_system: ex.is_system,
          rep_category: ex.rep_category,
          target_sets: ex.target_sets,
        });
        missing += 1;
      }
    }
    setPicks(next);
    setTraysOpen(true);
    const count = next.size;
    if (missing > 0) {
      toast.warning(`Шаблон применён · ${count} упр. (${missing} нет в каталоге)`);
    } else {
      toast.success(`Шаблон применён · ${count} упр.`);
    }
  }

  function onTemplateTap(t: WorkoutTemplate) {
    if (picks.size === 0) {
      applyTemplate(t);
      return;
    }
    const ok = window.confirm(
      `Заменить текущую подборку (${picks.size} упр.) на шаблон «${t.title ?? 'Тренировка'}»?`,
    );
    if (ok) applyTemplate(t);
  }

  const muscleChips = useMemo(() => {
    const counts: Record<string, number> = { '': exercises.length };
    for (const ex of exercises) {
      for (const m of ex.muscle_groups) {
        counts[m] = (counts[m] ?? 0) + 1;
      }
    }
    const chips: Array<{ key: string; label: string; count: number }> = [
      { key: '', label: 'Все', count: counts[''] ?? 0 },
    ];
    for (const m of FILTER_ORDER) {
      if (counts[m]) chips.push({ key: m, label: MUSCLE_LABELS[m], count: counts[m] });
    }
    return chips;
  }, [exercises]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (muscle && !ex.muscle_groups.includes(muscle)) return false;
      if (q && !ex.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [exercises, query, muscle]);

  function toggle(ex: CatalogExercise) {
    setPicks((prev) => {
      const next = new Map(prev);
      if (next.has(ex.id)) {
        next.delete(ex.id);
      } else {
        next.set(ex.id, {
          exercise_id: ex.id,
          name: ex.name,
          muscle_groups: ex.muscle_groups,
          is_system: ex.is_system,
          rep_category: 'classic',
          target_sets: 3,
        });
      }
      return next;
    });
  }

  function updatePick(id: string, patch: Partial<Pick>) {
    setPicks((prev) => {
      const cur = prev.get(id);
      if (!cur) return prev;
      const next = new Map(prev);
      next.set(id, { ...cur, ...patch });
      return next;
    });
  }

  function removePick(id: string) {
    setPicks((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }

  function start() {
    if (picks.size === 0) return;
    const payload = Array.from(picks.values()).map((p) => ({
      exercise_id: p.exercise_id,
      rep_category: p.rep_category,
      target_sets: p.target_sets,
    }));
    startTransition(async () => {
      const res = await createAdHocSession(payload);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      router.push('/');
      router.refresh();
    });
  }

  const pickList = Array.from(picks.values());

  return (
    <div className="pb-[140px]">
      <Stagger className="px-5 pt-9">
        <Reveal>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-text-tertiary active:text-text-secondary"
          >
            <ArrowLeft size={14} /> Назад
          </Link>
        </Reveal>

        <Reveal className="mt-2">
          <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.022em]">
            Соберите тренировку
          </h1>
          <div className="mt-1 text-[14px] text-text-secondary">
            Выберите упражнения, потом задайте подходы.
          </div>
        </Reveal>

        <Reveal className="mt-5">
          <div className="flex h-11 items-center gap-2.5 rounded-2xl bg-white/[0.05] px-3.5">
            <Search size={16} className="text-text-tertiary" strokeWidth={2.2} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск упражнений"
              className="flex-1 bg-transparent text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
            />
            {query && (
              <button
                type="button"
                aria-label="Очистить"
                onClick={() => setQuery('')}
                className="text-text-tertiary active:text-text-secondary"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </Reveal>
      </Stagger>

      <div className="mt-4 overflow-x-auto px-5 pb-1 [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2">
          {muscleChips.map((c) => {
            const active = c.key === muscle;
            return (
              <button
                key={c.key || 'all'}
                type="button"
                onClick={() => setMuscle(c.key)}
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
              </button>
            );
          })}
        </div>
      </div>

      {/* Templates */}
      {templates.length > 0 && (
        <section className="mt-5">
          <div className="flex items-baseline justify-between px-5">
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
              <Layers
                size={11}
                strokeWidth={2.4}
                className="mr-1 -mt-0.5 inline-block text-accent-green"
              />
              Шаблоны
              <span className="ml-1.5 text-text-tertiary tabular-nums">
                ({templates.length})
              </span>
            </h3>
            <span className="text-[11px] text-text-tertiary">
              Из ваших планов
            </span>
          </div>
          <div className="mt-3 overflow-x-auto px-5 pb-2 [&::-webkit-scrollbar]:hidden">
            <ul className="flex gap-2.5">
              {templates.map((t, idx) => (
                <TemplateChip
                  key={t.planDayId}
                  template={t}
                  index={idx}
                  onTap={() => onTemplateTap(t)}
                />
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Picks tray */}
      <AnimatePresence initial={false}>
        {pickList.length > 0 && (
          <motion.section
            key="picks-tray"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="mt-5 px-5"
          >
            <button
              type="button"
              onClick={() => setTraysOpen((v) => !v)}
              className="flex w-full items-center justify-between text-left"
            >
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                Выбрано
                <span className="ml-1.5 text-text-tertiary tabular-nums">
                  ({pickList.length})
                </span>
              </h3>
              <span className="text-[11.5px] text-text-tertiary">
                {traysOpen ? 'Свернуть' : 'Развернуть'}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {traysOpen && (
                <motion.ul
                  key="picks-list"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="mt-3 space-y-2 overflow-hidden"
                >
                  {pickList.map((p) => (
                    <motion.li
                      key={p.exercise_id}
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.22 }}
                      className="rounded-2xl bg-white/[0.04] px-3.5 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <ExerciseAvatar
                          name={p.name}
                          muscleGroups={p.muscle_groups}
                          isSystem={p.is_system}
                          size={36}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-semibold leading-tight truncate">
                            {p.name}
                          </div>
                          <div className="mt-0.5 text-[11px] text-text-tertiary truncate">
                            {p.muscle_groups
                              .map((m) => MUSCLE_LABELS[m as MuscleGroup] ?? m)
                              .join(' · ')}
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label="Убрать"
                          onClick={() => removePick(p.exercise_id)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-crimson/12 text-accent-crimson active:scale-95"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-3">
                        <div className="flex gap-1.5">
                          {CATEGORY_OPTIONS.map((opt) => {
                            const active = opt.value === p.rep_category;
                            const palette = CATEGORY_PALETTE[opt.value];
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                aria-label={opt.label}
                                onClick={() =>
                                  updatePick(p.exercise_id, { rep_category: opt.value })
                                }
                                className={cn(
                                  'flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold transition-all',
                                  active ? palette.active : palette.idle,
                                )}
                              >
                                {opt.short}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] uppercase tracking-[0.08em] text-text-tertiary">
                            Подходы
                          </span>
                          <CompactStepper
                            value={p.target_sets}
                            onChange={(v) => updatePick(p.exercise_id, { target_sets: v })}
                            min={1}
                            max={10}
                          />
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Catalog */}
      <section className="mt-6 px-5">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          Каталог
          <span className="ml-1.5 text-text-tertiary tabular-nums">
            ({filtered.length})
          </span>
        </h3>
        <ul className="mt-3 divide-y divide-white/[0.04] overflow-hidden rounded-2xl bg-white/[0.02]">
          {filtered.length === 0 && (
            <li className="px-4 py-10 text-center text-[13px] text-text-tertiary">
              Ничего не найдено
            </li>
          )}
          {filtered.map((ex) => {
            const picked = picks.has(ex.id);
            return (
              <li key={ex.id}>
                <button
                  type="button"
                  onClick={() => toggle(ex)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                    picked ? 'bg-accent-green/[0.06]' : 'active:bg-white/[0.03]',
                  )}
                >
                  <ExerciseAvatar
                    name={ex.name}
                    muscleGroups={ex.muscle_groups}
                    isSystem={ex.is_system}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold truncate">{ex.name}</div>
                    <div className="text-[11.5px] text-text-tertiary truncate">
                      {ex.muscle_groups
                        .map((m) => MUSCLE_LABELS[m as MuscleGroup] ?? m)
                        .join(' · ')}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all',
                      picked
                        ? 'bg-accent-green text-black'
                        : 'border border-white/[0.10] text-text-tertiary',
                    )}
                  >
                    {picked ? (
                      <Check size={14} strokeWidth={3} />
                    ) : (
                      <Plus size={14} strokeWidth={2.4} />
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Sticky CTA */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        <div
          className="pointer-events-auto safe-bottom px-5 pb-5 pt-4"
          style={{
            background:
              'linear-gradient(180deg, rgba(11,11,14,0) 0%, rgba(11,11,14,0.92) 40%, rgba(11,11,14,1) 100%)',
          }}
        >
          <button
            type="button"
            onClick={start}
            disabled={picks.size === 0 || isPending}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-black active:scale-[0.985] transition-transform disabled:opacity-40"
            style={{
              background: 'linear-gradient(180deg, #3DD668 0%, #2BB955 100%)',
              boxShadow: '0 10px 28px -10px rgba(52,199,89,0.55)',
            }}
          >
            <Play size={15} fill="currentColor" />
            {isPending
              ? 'Запускаю…'
              : picks.size === 0
                ? 'Выберите упражнения'
                : `Начать тренировку · ${picks.size}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Compact inline stepper for the picks tray (smaller than the global Stepper). */
function CompactStepper({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-1 py-1">
      <button
        type="button"
        aria-label="Меньше"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-text-primary active:scale-95 disabled:opacity-30"
      >
        −
      </button>
      <span className="min-w-[18px] text-center text-[14px] font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label="Больше"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-text-primary active:scale-95 disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}

interface TemplateChipProps {
  template: WorkoutTemplate;
  index: number;
  onTap: () => void;
}

function TemplateChip({ template, index, onTap }: TemplateChipProps) {
  // Up to two image previews from the template's first system exercises.
  const previews: Array<{ url: string; name: string }> = [];
  for (const ex of template.exercises) {
    if (previews.length >= 2) break;
    if (!ex.is_system) continue;
    const url = exerciseImageUrl(ex.exercise_name);
    if (url) previews.push({ url, name: ex.exercise_name });
  }

  const primary = template.exercises[0]?.muscle_groups[0] ?? 'chest';
  const gradients: Record<string, string> = {
    chest: 'linear-gradient(135deg, #FF2D5544 0%, #FF6F0044 100%)',
    back: 'linear-gradient(135deg, #34C75944 0%, #00C6BE44 100%)',
    shoulders: 'linear-gradient(135deg, #FFB14244 0%, #FF950044 100%)',
    biceps: 'linear-gradient(135deg, #AF52DE44 0%, #FF2D5544 100%)',
    triceps: 'linear-gradient(135deg, #FF6F0044 0%, #FFB14244 100%)',
    quads: 'linear-gradient(135deg, #00C6BE44 0%, #34C75944 100%)',
    hamstrings: 'linear-gradient(135deg, #5856D644 0%, #AF52DE44 100%)',
    glutes: 'linear-gradient(135deg, #FF2D5544 0%, #AF52DE44 100%)',
    calves: 'linear-gradient(135deg, #34C75944 0%, #FFB14244 100%)',
    abs: 'linear-gradient(135deg, #5856D644 0%, #00C6BE44 100%)',
  };
  const gradient =
    gradients[primary] ??
    'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)';

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.34,
        ease: [0.22, 1, 0.36, 1],
        delay: 0.05 + index * 0.04,
      }}
      className="shrink-0"
    >
      <button
        type="button"
        onClick={onTap}
        className="flex w-[180px] flex-col gap-2.5 rounded-[22px] bg-bg-elevated p-3 text-left transition-transform active:scale-[0.985]"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)' }}
      >
        <div
          className="relative h-[88px] overflow-hidden rounded-xl"
          style={{ background: gradient }}
        >
          {previews.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-text-tertiary">
              <Layers size={22} strokeWidth={1.8} />
            </div>
          )}
          {previews.length === 1 && (
            <Image
              src={previews[0].url}
              alt={previews[0].name}
              fill
              sizes="160px"
              className="object-cover"
              unoptimized
            />
          )}
          {previews.length === 2 && (
            <div className="absolute inset-0 grid grid-cols-2 gap-[1px]">
              {previews.map((p) => (
                <div key={p.url} className="relative">
                  <Image
                    src={p.url}
                    alt={p.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          )}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(11,11,14,0) 35%, rgba(11,11,14,0.55) 100%)',
            }}
          />
          <div className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2 py-0.5 backdrop-blur">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
              {WEEKDAY_SHORT[template.weekday] ?? ''}
            </span>
          </div>
        </div>
        <div className="px-0.5">
          <div className="line-clamp-1 text-[14px] font-semibold leading-tight text-text-primary">
            {template.title ?? 'Тренировка'}
          </div>
          <div className="mt-0.5 text-[11.5px] text-text-tertiary tabular-nums">
            {template.exercises.length} упр.
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            {template.isActivePlan && (
              <span className="h-1.5 w-1.5 rounded-full bg-accent-crimson" />
            )}
            <div className="line-clamp-1 text-[10.5px] text-text-tertiary">
              из плана: {template.planName}
            </div>
          </div>
        </div>
      </button>
    </motion.li>
  );
}
