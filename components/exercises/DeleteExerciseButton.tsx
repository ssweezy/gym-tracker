'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteCustomExercise } from '@/server/exercises';
import { tapMedium, tapSuccess, tapError } from '@/lib/haptics';

interface Props {
  exerciseId: string;
  exerciseName: string;
}

export function DeleteExerciseButton({ exerciseId, exerciseName }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  function onTrigger() {
    tapMedium();
    setConfirming(true);
  }

  function onCancel() {
    tapMedium();
    setConfirming(false);
  }

  function onConfirm() {
    tapMedium();
    start(async () => {
      const res = await deleteCustomExercise(exerciseId);
      if (res.error) {
        tapError();
        toast.error(res.error);
        return;
      }
      tapSuccess();
      toast.success(`«${exerciseName}» удалено`);
      router.push('/exercises');
      router.refresh();
    });
  }

  if (confirming) {
    return (
      <div className="overflow-hidden rounded-[22px] bg-bg-elevated p-5">
        <div className="text-[14px] font-semibold text-text-primary">
          Удалить «{exerciseName}»?
        </div>
        <div className="mt-1.5 text-[12.5px] text-text-tertiary">
          Действие необратимо. Упражнение будет убрано из всех дней плана, а
          его записанные подходы (история и личный рекорд) — удалены.
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="flex h-11 flex-1 items-center justify-center rounded-2xl bg-white/[0.05] text-[14px] font-semibold text-text-primary active:scale-[0.985] transition-transform disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl text-[14px] font-semibold text-white active:scale-[0.985] transition-transform disabled:opacity-50"
            style={{
              background: 'linear-gradient(180deg, #FF4E70 0%, #FF2D55 100%)',
              boxShadow: '0 8px 24px -8px rgba(255,45,85,0.45)',
            }}
          >
            <Trash2 size={15} strokeWidth={2.4} />
            {pending ? 'Удаляю…' : 'Удалить'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onTrigger}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent-crimson/12 text-[14px] font-semibold text-accent-crimson active:bg-accent-crimson/18 transition-colors"
    >
      <Trash2 size={15} strokeWidth={2.4} />
      Удалить упражнение
    </button>
  );
}
