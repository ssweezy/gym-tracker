'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  ChevronRight,
  Minus,
  Plus,
  RotateCcw,
  Search,
  SkipForward,
  Trophy,
} from 'lucide-react';
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
import {
  setSkippedExercise,
  setExerciseSetsOverride,
} from '@/server/session-meta';
import { REP_RANGES, type RepCategory, type Reasoning } from '@/lib/progression';
import { MUSCLE_LABELS, type MuscleGroup } from '@/lib/volume';
import { tapSoft } from '@/lib/haptics';
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
  /** plan_exercise ids the user marked "не выполнено" (from session.meta). */
  skippedExerciseIds?: string[];
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
 * Renders the per-exercise cards for an in-progress plan workout.
 *
 * The expanded ("active") card is normally the first unresolved exercise,
 * but tapping ANY collapsed card jumps straight to it — order is not
 * enforced. Each exercise can be marked «не выполнено» (skipped, persisted
 * in session.meta) and its target set count can be changed mid-workout.
 */
export function PlanExerciseFlow({
  sessionId,
  items,
  planDayId,
  catalog,
  existingExerciseIds,
  skippedExerciseIds,
}: PlanExerciseFlowProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [, startMeta] = useTransition();
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
  const [skipped, setSkipped] = useState<Set<string>>(
    () => new Set(skippedExerciseIds ?? []),
  );
  // Explicit user tap — overrides the natural next-up exercise.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Local set-count overrides for instant feedback; also persisted server-side.
  const [overrides, setOverrides] = useState<Map<string, number>>(new Map());
  const [quickAddFor, setQuickAddFor] = useState<string | null>(null);

  const effTarget = (it: PlanExerciseFlowItem) =>
    overrides.get(it.planExerciseId) ?? it.targetSets;

  const firstUnresolvedId = useMemo(() => {
    for (const it of items) {
      if (skipped.has(it.planExerciseId)) continue;
      if (finishedIds.has(it.planExerciseId)) continue;
      return it.planExerciseId;
    }
    return null;
  }, [items, finishedIds, skipped]);

  const activeId =
    selectedId && !skipped.has(selectedId) ? selectedId : firstUnresolvedId;

  const resolvedCount = items.filter(
    (it) =>
      skipped.has(it.planExerciseId) || finishedIds.has(it.planExerciseId),
  ).length;

  function selectExercise(id: string) {
    tapSoft();
    setSelectedId(id);
  }

  function markFinished(id: string) {
    setFinishedIds((prev) => new Set(prev).add(id));
    setSelectedId((cur) => (cur === id ? null : cur));
    // Let the server recompute (e.g., session stats, next-exercise suggestion).
    router.refresh();
  }

  function toggleSkip(it: PlanExerciseFlowItem) {
    const willSkip = !skipped.has(it.planExerciseId);
    tapSoft();
    setSkipped((prev) => {
      const next = new Set(prev);
      if (willSkip) next.add(it.planExerciseId);
      else next.delete(it.planExerciseId);
      return next;
    });
    // Skipping the open card → fall back to next-up. Un-skipping → open it.
    setSelectedId((cur) => {
      if (willSkip) return cur === it.planExerciseId ? null : cur;
      return it.planExerciseId;
    });
    startMeta(async () => {
      const res = await setSkippedExercise(
        sessionId,
        it.planExerciseId,
        willSkip,
      );
      if (res.error) toast.error(res.error);
      router.refresh();
    });
  }

  function changeTarget(it: PlanExerciseFlowItem, next: number) {
    const clamped = Math.max(1, Math.min(20, next));
    if (clamped === effTarget(it)) return;
    tapSoft();
    setOverrides((prev) => new Map(prev).set(it.planExerciseId, clamped));
    startMeta(async () => {
      const res = await setExerciseSetsOverride(
        sessionId,
        it.planExerciseId,
        clamped,
      );
      if (res.error) toast.error(res.error);
    });
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
          {resolvedCount} из {items.length}
        </span>
      </Reveal>

      <Stagger className="mt-3 space-y-2">
        {items.map((it) => {
          const isSkipped = skipped.has(it.planExerciseId);
          const isActive = !isSkipped && it.planExerciseId === activeId;
          const isFinished =
            !isSkipped && !isActive && finishedIds.has(it.planExerciseId);
          const target = effTarget(it);

          if (isSkipped) {
            return (
              <Reveal key={it.planExerciseId}>
                <button
                  type="button"
                  onClick={() => toggleSkip(it)}
                  className="flex w-full items-center gap-3.5 rounded-2xl bg-white/[0.02] px-4 py-3.5 text-left opacity-70 transition-opacity active:opacity-100"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.06]">
                    <SkipForward size={15} className="text-text-tertiary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium text-text-tertiary line-through decoration-text-tertiary/40">
                      {it.exerciseName}
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-text-tertiary">
                      Пропущено · нажмите, чтобы выполнить
                    </div>
                  </div>
                  <RotateCcw size={15} className="shrink-0 text-text-tertiary" />
                </button>
              </Reveal>
            );
          }

          if (isFinished) {
            const lastSet = it.doneSets[it.doneSets.length - 1];
            return (
              <Reveal key={it.planExerciseId}>
                <div className="rounded-2xl bg-white/[0.025] px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => selectExercise(it.planExerciseId)}
                    className="flex w-full items-center gap-3.5 text-left active:opacity-80"
                  >
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
                    <ChevronRight size={16} className="shrink-0 text-text-tertiary" />
                  </button>
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
                {/* Mid-workout controls: change target sets, mark skipped. */}
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex items-center gap-0.5 rounded-2xl bg-white/[0.04] p-1">
                    <button
                      type="button"
                      onClick={() => changeTarget(it, target - 1)}
                      disabled={target <= 1}
                      aria-label="Меньше подходов"
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary active:scale-90 disabled:opacity-30 transition-transform"
                    >
                      <Minus size={15} strokeWidth={2.6} />
                    </button>
                    <span className="min-w-[4.25rem] text-center text-[12.5px] font-semibold tabular-nums text-text-secondary">
                      {target} подх.
                    </span>
                    <button
                      type="button"
                      onClick={() => changeTarget(it, target + 1)}
                      disabled={target >= 20}
                      aria-label="Больше подходов"
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary active:scale-90 disabled:opacity-30 transition-transform"
                    >
                      <Plus size={15} strokeWidth={2.6} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSkip(it)}
                    className="ml-auto flex items-center gap-1.5 rounded-2xl bg-white/[0.04] px-3.5 py-2.5 text-[12.5px] font-semibold text-text-secondary active:scale-[0.97] transition-transform"
                  >
                    <SkipForward size={13} strokeWidth={2.4} />
                    Не выполнено
                  </button>
                </div>
                <SetLogger
                  exerciseName={it.exerciseName}
                  exerciseId={it.exerciseId}
                  category={it.category}
                  totalSets={target}
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

          // pending — tap to jump straight to this exercise
          const cat = categoryShort(it.category);
          return (
            <Reveal key={it.planExerciseId}>
              <button
                type="button"
                onClick={() => selectExercise(it.planExerciseId)}
                className="flex w-full items-center gap-3.5 rounded-2xl bg-white/[0.025] px-4 py-3.5 text-left active:bg-white/[0.04] transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-[12.5px] font-semibold tabular-nums text-text-secondary">
                  {target}
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
                <ChevronRight size={18} className="shrink-0 text-text-tertiary" />
              </button>
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
