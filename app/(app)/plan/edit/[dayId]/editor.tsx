'use client';

import { useMemo, useState, useTransition } from 'react';
import { ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Sheet } from '@/components/ui/sheet';
import { Stepper } from '@/components/ui/stepper';
import { ExerciseAvatar } from '@/components/exercises/ExerciseAvatar';
import { RepCategoryPicker } from '@/components/plan/RepCategoryPicker';
import { cn } from '@/lib/utils';
import { MUSCLE_LABELS, type MuscleGroup } from '@/lib/volume';
import { REP_RANGES, type RepCategory } from '@/lib/progression';
import {
  addExerciseToPlanDay,
  removePlanExercise,
  updatePlanExercise,
} from '@/server/plan-actions';

interface DayExercise {
  id: string;
  exercise_id: string;
  name: string;
  muscle_groups: string[];
  rep_category: string;
  target_sets: number;
  is_system: boolean;
}

interface ExerciseLite {
  id: string;
  name: string;
  muscle_groups: string[];
  is_system: boolean;
}

interface DayEditorProps {
  dayId: string;
  isRest: boolean;
  exercises: DayExercise[];
  allExercises: ExerciseLite[];
}

function categoryLabel(cat: string): { label: string; range: string; color: string } {
  if (cat === 'strength') return { label: 'Силовая', range: '5–8', color: 'text-accent-crimson bg-accent-crimson/12' };
  if (cat === 'classic') return { label: 'Классика', range: '8–12', color: 'text-accent-green bg-accent-green/12' };
  return { label: 'Новичок', range: '12–15', color: 'text-text-secondary bg-white/[0.06]' };
}

export function DayEditor({ dayId, isRest, exercises, allExercises }: DayEditorProps) {
  const [editing, setEditing] = useState<DayExercise | null>(null);
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();

  const existingIds = useMemo(
    () => new Set(exercises.map((e) => e.exercise_id)),
    [exercises],
  );

  if (isRest) {
    return (
      <div className="rounded-[22px] bg-bg-elevated p-6 text-center text-[13px] text-text-secondary">
        День отдыха. Тренировка не запланирована.
      </div>
    );
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const res = await removePlanExercise(id);
      if (res.error) toast.error(res.error);
      else toast.success('Упражнение удалено');
    });
  }

  return (
    <div className="space-y-3">
      {exercises.length === 0 && (
        <div className="rounded-[22px] bg-bg-elevated p-6 text-center text-[13px] text-text-tertiary">
          Пока нет упражнений. Добавь первое.
        </div>
      )}

      {exercises.map((ex, i) => {
        const cat = categoryLabel(ex.rep_category);
        return (
          <motion.div
            key={ex.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.03 * i }}
            className="overflow-hidden rounded-[22px] bg-bg-elevated"
          >
            <div className="flex items-center gap-3 px-4 py-3.5">
              <ExerciseAvatar
                name={ex.name}
                muscleGroups={ex.muscle_groups}
                isSystem={ex.is_system}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-semibold leading-tight tracking-tight truncate">
                    {ex.name}
                  </h3>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-text-tertiary tabular-nums">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold',
                      cat.color,
                    )}
                  >
                    {cat.label} · {cat.range}
                  </span>
                  <span>· {ex.target_sets} подх.</span>
                </div>
              </div>
              <button
                onClick={() => setEditing(ex)}
                aria-label="Изменить"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.05] active:scale-95"
              >
                <Pencil size={14} className="text-text-secondary" />
              </button>
              <button
                onClick={() => handleRemove(ex.id)}
                aria-label="Удалить"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-crimson/12 text-accent-crimson active:scale-95"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </motion.div>
        );
      })}

      <button
        onClick={() => setAdding(true)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.08] text-[14px] font-semibold text-text-secondary hover:bg-white/[0.02] transition-colors"
      >
        <Plus size={16} />
        Добавить упражнение
      </button>

      {editing && (
        <EditSheet
          item={editing}
          onClose={() => setEditing(null)}
        />
      )}

      <AddExerciseSheet
        open={adding}
        onClose={() => setAdding(false)}
        dayId={dayId}
        allExercises={allExercises}
        existingIds={existingIds}
      />
    </div>
  );
}

function EditSheet({
  item,
  onClose,
}: {
  item: DayExercise;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<RepCategory>(
    (item.rep_category as RepCategory) ?? 'classic',
  );
  const [sets, setSets] = useState(item.target_sets);
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const res = await updatePlanExercise(item.id, {
        rep_category: category,
        target_sets: sets,
      });
      if (res.error) toast.error(res.error);
      else {
        toast.success('Сохранено');
        onClose();
      }
    });
  }

  return (
    <Sheet open onClose={onClose} title={item.name}>
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

        <button
          onClick={submit}
          disabled={isPending}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-black active:scale-[0.985] transition-transform disabled:opacity-50"
          style={{
            height: 52,
            background: 'linear-gradient(180deg, #3DD668 0%, #2BB955 100%)',
            boxShadow: '0 8px 24px -8px rgba(52,199,89,0.45)',
          }}
        >
          {isPending ? 'Сохраняю…' : 'Сохранить'}
        </button>
      </div>
    </Sheet>
  );
}

function AddExerciseSheet({
  open,
  onClose,
  dayId,
  allExercises,
  existingIds,
}: {
  open: boolean;
  onClose: () => void;
  dayId: string;
  allExercises: ExerciseLite[];
  existingIds: Set<string>;
}) {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<ExerciseLite | null>(null);
  const [category, setCategory] = useState<RepCategory>('classic');
  const [sets, setSets] = useState(3);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allExercises
      .filter((ex) => !existingIds.has(ex.id))
      .filter((ex) => (q ? ex.name.toLowerCase().includes(q) : true))
      .slice(0, 50);
  }, [query, allExercises, existingIds]);

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
      const res = await addExerciseToPlanDay(dayId, picked.id, category, sets);
      if (res.error) toast.error(res.error);
      else {
        toast.success(`«${picked.name}» добавлено`);
        close();
      }
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
