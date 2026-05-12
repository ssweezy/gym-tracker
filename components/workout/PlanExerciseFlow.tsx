'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight, Plus, Search, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { Reveal, Stagger } from '@/components/motion/stagger';
import { Sheet } from '@/components/ui/sheet';
import { Stepper } from '@/components/ui/stepper';
import { ExerciseAvatar } from '@/components/exercises/ExerciseAvatar';
import { RepCategoryPicker } from '@/components/plan/RepCategoryPicker';
import { SetLogger, type PendingSet, type PersonalBestSummary } from './SetLogger';
import { LoggedSetsList } from './LoggedSetsList';
import { QuickAddSetSheet } from './QuickAddSetSheet';
import { addExerciseToPlanDay } from '@/server/plan-actions';
import { REP_RANGES, type RepCategory, type Reasoning } from '@/lib/progression';
import { MUSCLE_LABELS, type MuscleGroup } from '@/lib/volume';
import { cn } from '@/lib/utils';

interface CatalogExercise {
  id: string;
  name: string;
  muscle_groups: string[];
  is_system: boolean;
}

export interface PlanExerciseFlowItem {
  /** plan_exercises.id — stable key */
  planExerciseId: string;
  exerciseId: string;
  exerciseName: string;
  category: RepCategory;
  targetSets: number;
  incrementKg: number;
  /** Sets already logged for this exercise in the current session. */
  doneSets: PendingSet[];
  /** Server-computed suggestion + last-set context for the SetLogger. */
  target: {
    suggestion: {
      weight_kg: number;
      target_reps: number;
      min_reps_followups: number;
      reasoning: Reasoning;
    };
    last?: {
      weight_kg: number;
      reps: number;
    };
  };
  personalBest: PersonalBestSummary | null;
}

interface PlanExerciseFlowProps {
  sessionId: string;
  items: PlanExerciseFlowItem[];
  /**
   * plan_day this session is tied to. Used to allow appending exercises to
   * the plan_day mid-workout. Optional for backwards-compat.
   */
  planDayId?: string;
  /** Full catalog for the in-session "+ Добавить упражнение" sheet. */
  catalog?: CatalogExercise[];
  /** Exercise ids already in the plan_day — hidden from the picker. */
  existingExerciseIds?: string[];
}

function categoryShort(cat: RepCategory): { label: string; range: string; color: 'crimson' | 'green' | 'gray' } {
  if (cat === 'strength') return { label: 'Силовая', range: '5–8', color: 'crimson' };
  if (cat === 'classic') return { label: 'Классика', range: '8–12', color: 'green' };
  return { label: 'Новичок', range: '12–15', color: 'gray' };
}

function CategoryBadge({ category }: { category: RepCategory }) {
  const cat = categoryShort(category);
  const palette: Record<'green' | 'crimson' | 'gray', string> = {
    green: 'bg-accent-green/12 text-accent-green',
    crimson: 'bg-accent-crimson/12 text-accent-crimson',
    gray: 'bg-white/[0.06] text-text-secondary',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tabular-nums',
        palette[cat.color],
      )}
    >
      {cat.label} · {cat.range}
    </span>
  );
}

/**
 * Renders the per-exercise cards for an in-progress plan workout. The user
 * advances explicitly via the "Готово" button on the SetLogger — sets past
 * `target_sets` don't auto-collapse the card. Manually-finished exercises
 * stay visible with a per-set list and a "+" button for ad-hoc extra sets.
 */
export function PlanExerciseFlow({
  sessionId,
  items,
  planDayId,
  catalog,
  existingExerciseIds,
}: PlanExerciseFlowProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [finishedIds, setFinishedIds] = useState<Set<string>>(() => {
    // Initial seed: any exercise that already meets its target on server load
    // before the first under-target exercise is considered finished. Anything
    // after stays pending so the user can still revise an in-flight session.
    const seed = new Set<string>();
    let foundActive = false;
    for (const it of items) {
      if (foundActive) break;
      if (it.doneSets.length >= it.targetSets) {
        seed.add(it.planExerciseId);
      } else {
        foundActive = true;
      }
    }
    return seed;
  });
  const [quickAddFor, setQuickAddFor] = useState<string | null>(null);

  const activeId = useMemo(() => {
    for (const it of items) {
      if (!finishedIds.has(it.planExerciseId)) return it.planExerciseId;
    }
    return null;
  }, [items, finishedIds]);

  const completedCount = items.filter((it) => finishedIds.has(it.planExerciseId)).length;

  function markFinished(id: string) {
    setFinishedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    // Let the server recompute (e.g., session stats, next-exercise suggestion).
    router.refresh();
  }

  function openQuickAdd(id: string) {
    setQuickAddFor(id);
  }

  return (
    <>
      <Reveal className="mt-7 flex items-baseline justify-between">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          Упражнения
        </h3>
        <span className="text-[12px] text-text-tertiary tabular-nums">
          {completedCount} из {items.length}
        </span>
      </Reveal>

      <Stagger className="mt-3 space-y-2">
        {items.map((it) => {
          const isFinished = finishedIds.has(it.planExerciseId);
          const isActive = !isFinished && it.planExerciseId === activeId;
          const isPending = !isFinished && !isActive;

          if (isFinished) {
            const lastSet = it.doneSets[it.doneSets.length - 1];
            return (
              <Reveal key={it.planExerciseId}>
                <div className="rounded-2xl bg-white/[0.025] px-4 py-3.5">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-green/15">
                      <Check size={16} strokeWidth={2.8} className="text-accent-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-secondary truncate">
                        {it.exerciseName}
                      </div>
                      <div className="mt-0.5 text-[11.5px] text-text-tertiary tabular-nums">
                        {it.doneSets.length} подх.
                        {lastSet ? ` · ${lastSet.reps} × ${lastSet.weight_kg} кг` : ''}
                      </div>
                    </div>
                  </div>
                  <LoggedSetsList
                    sets={it.doneSets.map((s) => ({
                      weight_kg: s.weight_kg,
                      reps: s.reps,
                      completed_at: s.completed_at ?? null,
                    }))}
                    onAdd={() => openQuickAdd(it.planExerciseId)}
                  />
                </div>
              </Reveal>
            );
          }

          if (isActive) {
            return (
              <Reveal key={it.planExerciseId}>
                <SetLogger
                  exerciseName={it.exerciseName}
                  exerciseId={it.exerciseId}
                  category={it.category}
                  totalSets={it.targetSets}
                  doneSets={it.doneSets}
                  sessionId={sessionId}
                  increment_kg={it.incrementKg}
                  personalBest={it.personalBest}
                  target={it.target}
                  onFinish={() => markFinished(it.planExerciseId)}
                />
              </Reveal>
            );
          }

          // pending
          const cat = categoryShort(it.category);
          return (
            <Reveal key={it.planExerciseId}>
              <div className="flex w-full items-center gap-3.5 rounded-2xl bg-white/[0.025] px-4 py-3.5 text-left">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-[12.5px] font-semibold tabular-nums text-text-secondary">
                  {it.targetSets}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{it.exerciseName}</div>
                  <div className="mt-1">
                    <CategoryBadge category={it.category} />
                    <span className="ml-2 text-[11.5px] text-text-tertiary tabular-nums">
                      {REP_RANGES[it.category] && <>{cat.range}</>}
                    </span>
                  </div>
                  {it.personalBest && (
                    <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-accent-warning tabular-nums">
                      <Trophy size={11} strokeWidth={2.4} /> ЛР:{' '}
                      <span className="text-text-secondary">
                        {it.personalBest.reps} × {it.personalBest.weight_kg} кг
                      </span>
                    </div>
                  )}
                </div>
                <ChevronRight size={18} className="text-text-tertiary" />
              </div>
            </Reveal>
          );
        })}

        {planDayId && catalog && (
          <Reveal>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.10] text-[14px] font-semibold text-text-secondary hover:bg-white/[0.02] transition-colors"
            >
              <Plus size={16} />
              Добавить упражнение
            </button>
          </Reveal>
        )}
      </Stagger>

      {items.map((it) => {
        if (quickAddFor !== it.planExerciseId) return null;
        const last = it.doneSets[it.doneSets.length - 1];
        return (
          <QuickAddSetSheet
            key={`qa-${it.planExerciseId}`}
            open
            onClose={() => setQuickAddFor(null)}
            exerciseName={it.exerciseName}
            exerciseId={it.exerciseId}
            sessionId={sessionId}
            initialWeight={last?.weight_kg ?? it.target.suggestion.weight_kg}
            initialReps={last?.reps ?? it.target.suggestion.target_reps}
            incrementKg={it.incrementKg}
            targetReps={it.target.suggestion.target_reps}
            isFirstSet={false}
          />
        );
      })}

      {planDayId && catalog && (
        <AddExerciseSheet
          open={addOpen}
          onClose={() => setAddOpen(false)}
          planDayId={planDayId}
          catalog={catalog}
          existingIds={existingExerciseIds ?? []}
        />
      )}
    </>
  );
}

function AddExerciseSheet({
  open,
  onClose,
  planDayId,
  catalog,
  existingIds,
}: {
  open: boolean;
  onClose: () => void;
  planDayId: string;
  catalog: CatalogExercise[];
  existingIds: string[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<CatalogExercise | null>(null);
  const [category, setCategory] = useState<RepCategory>('classic');
  const [sets, setSets] = useState(3);
  const [isPending, startTransition] = useTransition();

  const existingSet = useMemo(() => new Set(existingIds), [existingIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog
      .filter((ex) => !existingSet.has(ex.id))
      .filter((ex) => (q ? ex.name.toLowerCase().includes(q) : true))
      .slice(0, 50);
  }, [catalog, query, existingSet]);

  function close() {
    setPicked(null);
    setQuery('');
    setCategory('classic');
    setSets(3);
    onClose();
  }

  function submit() {
    if (!picked) return;
    startTransition(async () => {
      const res = await addExerciseToPlanDay(planDayId, picked.id, category, sets);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`«${picked.name}» добавлено`);
      close();
      router.refresh();
    });
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title={picked ? picked.name : 'Добавить упражнение'}
    >
      {!picked ? (
        <div>
          <div className="flex h-11 items-center gap-2.5 rounded-2xl bg-white/[0.05] px-3.5">
            <Search size={16} className="text-text-tertiary" strokeWidth={2.2} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск упражнений"
              className="flex-1 bg-transparent text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
            />
          </div>
          <ul className="mt-4 divide-y divide-white/[0.04] overflow-hidden rounded-2xl bg-white/[0.02]">
            {filtered.length === 0 && (
              <li className="px-4 py-10 text-center text-[13px] text-text-tertiary">
                Ничего не найдено
              </li>
            )}
            {filtered.map((ex) => (
              <li key={ex.id}>
                <button
                  onClick={() => setPicked(ex)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-white/[0.03]"
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
                  <ChevronRight size={16} className="text-text-tertiary" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
              Категория повторений
            </h3>
            <div className="mt-2">
              <RepCategoryPicker value={category} onChange={setCategory} />
            </div>
            <div className="mt-2 text-[11.5px] text-text-tertiary tabular-nums">
              Диапазон: {REP_RANGES[category].low}–{REP_RANGES[category].high} повт.
            </div>
          </div>
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
              Количество подходов
            </h3>
            <div className="mt-2 flex items-center justify-center">
              <Stepper value={sets} onChange={setSets} min={1} max={10} step={1} />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPicked(null)}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-white/[0.05] text-[14px] font-semibold text-text-primary active:scale-[0.985]"
            >
              Назад
            </button>
            <button
              onClick={submit}
              disabled={isPending}
              className="flex h-12 flex-[1.6] items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-black active:scale-[0.985] disabled:opacity-50"
              style={{
                background: 'linear-gradient(180deg, #3DD668 0%, #2BB955 100%)',
                boxShadow: '0 8px 24px -8px rgba(52,199,89,0.45)',
              }}
            >
              {isPending ? 'Добавляю…' : 'Добавить'}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
