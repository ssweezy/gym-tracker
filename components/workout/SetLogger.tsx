'use client';

import { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { Check, Timer, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { Stepper } from '@/components/ui/stepper';
import { WeightField } from './WeightField';
import { Toggle } from '@/components/ui/toggle';
import { SuggestedTarget, type SuggestedTargetData } from './SuggestedTarget';
import { useRestTimer } from './RestTimerContext';
import { LoggedSetsList } from './LoggedSetsList';
import { cn } from '@/lib/utils';
import { validateFollowupSet, REP_RANGES, type RepCategory } from '@/lib/progression';
import { logSetWithOffline } from '@/lib/pwa/log-set';
import { useOfflineQueue } from '@/components/pwa/OfflineQueueProvider';
import { tapError, tapSuccess } from '@/lib/haptics';

const categoryColor: Record<RepCategory, 'green' | 'crimson' | 'gray'> = {
  strength: 'crimson',
  classic: 'green',
  beginner: 'gray',
};

const categoryLabel: Record<RepCategory, string> = {
  strength: 'Силовая',
  classic: 'Классика',
  beginner: 'Новичок',
};

function CategoryBadge({ category }: { category: RepCategory }) {
  const palette: Record<'green' | 'crimson' | 'gray', string> = {
    green: 'bg-accent-green/12 text-accent-green',
    crimson: 'bg-accent-crimson/12 text-accent-crimson',
    gray: 'bg-white/[0.06] text-text-secondary',
  };
  const { low, high } = REP_RANGES[category];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tabular-nums',
        palette[categoryColor[category]],
      )}
    >
      {categoryLabel[category]} · {low}–{high}
    </span>
  );
}

export interface PendingSet {
  weight_kg: number;
  reps: number;
  is_first_set: boolean;
  completed_at?: string | null;
}

export interface PersonalBestSummary {
  weight_kg: number;
  reps: number;
}

interface SetLoggerProps {
  exerciseName: string;
  exerciseId: string;
  category: RepCategory;
  totalSets: number;
  doneSets: PendingSet[];
  sessionId: string;
  target: SuggestedTargetData;
  increment_kg: number;
  /** Personal-best summary; shown above the "Записать подход" CTA. */
  personalBest?: PersonalBestSummary | null;
  /** Called when the user explicitly taps "Готово · перейти к следующему". */
  onFinish?: () => void;
}

export function SetLogger({
  exerciseName,
  exerciseId,
  category,
  totalSets,
  doneSets,
  sessionId,
  target,
  increment_kg,
  personalBest,
  onFinish,
}: SetLoggerProps) {
  const isFirstSet = doneSets.length === 0;
  const [weight, setWeight] = useState(target.suggestion.weight_kg);
  const [reps, setReps] = useState(target.suggestion.target_reps);
  const [failure, setFailure] = useState(false);
  const [optimistic, setOptimistic] = useState<PendingSet[]>([]);
  const [isPending, startTransition] = useTransition();
  const { startRest } = useRestTimer();
  const { enqueue } = useOfflineQueue();

  const allDone = [...doneSets, ...optimistic];
  const firstSet = allDone.find((s) => s.is_first_set);
  const reachedTarget = allDone.length >= totalSets;

  function submit() {
    if (isFirstSet && !failure) {
      toast.error('Первый подход должен быть до отказа');
      tapError();
      return;
    }
    if (!isFirstSet && firstSet) {
      const check = validateFollowupSet(firstSet.reps, reps);
      if (check.warning) toast.warning(check.warning);
    }

    const newSet: PendingSet = {
      weight_kg: weight,
      reps,
      is_first_set: isFirstSet,
      completed_at: new Date().toISOString(),
    };
    setOptimistic((prev) => [...prev, newSet]);
    const target_reps = target.suggestion.target_reps;

    startTransition(async () => {
      const res = await logSetWithOffline(
        {
          session_id: sessionId,
          exercise_id: exerciseId,
          weight_kg: weight,
          reps,
          target_reps,
          is_first_set: isFirstSet,
          reached_failure: failure ? true : undefined,
        },
        { enqueue },
      );
      if (res.error) {
        setOptimistic((prev) => prev.slice(0, -1));
        toast.error(res.error);
        tapError();
      } else if (res.queued) {
        // Set is sitting in IDB; revalidatePath did NOT fire, so we KEEP the
        // optimistic copy in local state until the queue drains. Once the
        // online drain succeeds, the parent re-renders with the row in
        // `doneSets`, and we drop the duplicate on next submit.
        toast.success(
          'Подход сохранён локально — синканётся когда появится связь',
        );
        tapSuccess();
        startRest(90);
        setFailure(false);
      } else {
        // Server has persisted the set and revalidatePath has updated the
        // parent's `doneSets` prop. Drop the optimistic copy so we don't
        // render the same row twice.
        setOptimistic([]);
        toast.success('Подход записан');
        tapSuccess();
        startRest(90);
        setFailure(false);
      }
    });
  }

  const completed = allDone.length;
  const showSuggestion = isFirstSet && optimistic.length === 0;

  return (
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
              <CategoryBadge category={category} />
              <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-accent-green">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-green opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-green" />
                </span>
                Сейчас
              </span>
            </div>
            <h4 className="mt-2.5 text-[19px] font-semibold leading-tight tracking-tight">
              {exerciseName}
            </h4>
          </div>
          <div className="text-right shrink-0 tabular-nums">
            <div className="text-[18px] font-semibold leading-none">
              {completed}
              <span className="text-text-tertiary">/{totalSets}</span>
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.1em] text-text-tertiary">
              подходов
            </div>
          </div>
        </div>

        {showSuggestion && (
          <div className="mt-4">
            <SuggestedTarget data={target} />
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div className="rounded-2xl bg-white/[0.025] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-tertiary">
              Вес
            </div>
            <div className="mt-3">
              <WeightField
                value={weight}
                onChange={setWeight}
                defaultStep={increment_kg}
                exerciseId={exerciseId}
              />
            </div>
          </div>
          <div className="rounded-2xl bg-white/[0.025] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-tertiary">
              Повторения
            </div>
            <div className="mt-2 flex justify-center">
              <Stepper value={reps} onChange={setReps} step={1} min={1} max={50} />
            </div>
          </div>
          <Toggle
            pressed={failure}
            onPressedChange={setFailure}
            label={isFirstSet ? 'До отказа (обязательно)' : 'До отказа'}
            className="w-full justify-center"
          />
          {personalBest && (
            <div className="flex items-center justify-center gap-1.5 text-[11.5px] text-text-tertiary tabular-nums">
              <Trophy size={12} className="text-accent-warning" strokeWidth={2.2} />
              <span>
                Ваш максимум:{' '}
                <span className="text-text-secondary">
                  {personalBest.reps} повт. × {personalBest.weight_kg} кг
                </span>
              </span>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => startRest(90)}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-white/[0.05] text-[14px] font-semibold text-text-primary active:scale-[0.985]"
            >
              <Timer size={15} /> Отдых
            </button>
            <button
              onClick={submit}
              disabled={isPending}
              className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-black active:scale-[0.985] disabled:opacity-50"
              style={{
                background: 'linear-gradient(180deg, #3DD668 0%, #2BB955 100%)',
                boxShadow: '0 8px 24px -8px rgba(52,199,89,0.45)',
              }}
            >
              {isPending ? 'Сохраняю…' : 'Записать подход'}
            </button>
          </div>
        </div>

        {allDone.length > 0 && (
          <LoggedSetsList
            sets={allDone.map((s) => ({
              weight_kg: s.weight_kg,
              reps: s.reps,
              completed_at: s.completed_at ?? null,
            }))}
            hideAdd
          />
        )}

        {reachedTarget && onFinish && (
          <button
            type="button"
            onClick={onFinish}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-accent-green/12 text-[13.5px] font-semibold text-accent-green active:scale-[0.985] transition-transform"
          >
            <Check size={15} strokeWidth={2.6} /> Готово · перейти к следующему
          </button>
        )}
      </div>
    </motion.div>
  );
}
