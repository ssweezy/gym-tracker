'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Sheet } from '@/components/ui/sheet';
import { Stepper } from '@/components/ui/stepper';
import { Toggle } from '@/components/ui/toggle';
import { logSet } from '@/server/sets';

interface QuickAddSetSheetProps {
  open: boolean;
  onClose: () => void;
  exerciseName: string;
  exerciseId: string;
  sessionId: string;
  initialWeight: number;
  initialReps: number;
  incrementKg: number;
  /** Defaults to false. Used by extra-session flow where the very first set
   *  isn't routed through this sheet but follow-ups are. */
  isFirstSet?: boolean;
  /** Last logged set's target_reps, propagated so progression metadata is
   *  correct on the follow-up row. Falls back to `initialReps`. */
  targetReps?: number;
}

export function QuickAddSetSheet({
  open,
  onClose,
  exerciseName,
  exerciseId,
  sessionId,
  initialWeight,
  initialReps,
  incrementKg,
  isFirstSet = false,
  targetReps,
}: QuickAddSetSheetProps) {
  const router = useRouter();
  const [weight, setWeight] = useState(initialWeight);
  const [reps, setReps] = useState(initialReps);
  const [failure, setFailure] = useState(false);
  const [isPending, startTransition] = useTransition();

  function close() {
    setWeight(initialWeight);
    setReps(initialReps);
    setFailure(false);
    onClose();
  }

  function submit() {
    if (isFirstSet && !failure) {
      toast.error('Первый подход должен быть до отказа');
      return;
    }
    startTransition(async () => {
      const res = await logSet({
        session_id: sessionId,
        exercise_id: exerciseId,
        weight_kg: weight,
        reps,
        target_reps: targetReps ?? initialReps,
        is_first_set: isFirstSet,
        reached_failure: failure ? true : undefined,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success('Подход записан');
      close();
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onClose={close} title={exerciseName}>
      <div className="space-y-5">
        <div className="rounded-2xl bg-white/[0.025] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-tertiary">
            Вес
          </div>
          <div className="mt-2 flex justify-center">
            <Stepper
              value={weight}
              onChange={setWeight}
              step={incrementKg}
              precision={1}
              min={0}
              unit="кг"
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
        <div className="flex gap-2">
          <button
            onClick={close}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-white/[0.05] text-[14px] font-semibold text-text-primary active:scale-[0.985]"
          >
            Отмена
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
            {isPending ? 'Сохраняю…' : 'Записать подход'}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
