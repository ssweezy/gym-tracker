'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Play } from 'lucide-react';
import { toast } from 'sonner';
import { startSession } from '@/server/sessions';
import { tapMedium } from '@/lib/haptics';

interface StartWorkoutButtonProps {
  planDayId?: string | null;
  variant?: 'primary' | 'secondary';
  label?: string;
}

export function StartWorkoutButton({
  planDayId,
  variant = 'primary',
  label,
}: StartWorkoutButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function start() {
    tapMedium();
    // Off-plan flow now navigates to the ad-hoc builder instead of starting an
    // empty session in-place.
    if (!planDayId) {
      router.push('/workout/new');
      return;
    }
    startTransition(async () => {
      const res = await startSession(planDayId);
      if (res.error) toast.error(res.error);
      else router.refresh();
    });
  }

  if (variant === 'secondary') {
    return (
      <button
        onClick={start}
        disabled={isPending}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white/[0.05] text-[15px] font-semibold text-text-primary active:scale-[0.985] transition-transform disabled:opacity-50"
      >
        <Play size={15} fill="currentColor" />
        {isPending ? 'Запускаю…' : label ?? 'Внеплановая тренировка'}
      </button>
    );
  }

  return (
    <button
      onClick={start}
      disabled={isPending}
      className="flex w-full items-center justify-center gap-2 rounded-2xl text-[16px] font-semibold text-black active:scale-[0.985] transition-transform disabled:opacity-50"
      style={{
        height: 56,
        background: 'linear-gradient(180deg, #3DD668 0%, #2BB955 100%)',
        boxShadow: '0 10px 28px -10px rgba(52,199,89,0.55)',
      }}
    >
      <Play size={16} fill="currentColor" />
      {isPending ? 'Запускаю…' : label ?? 'Начать тренировку'}
    </button>
  );
}
