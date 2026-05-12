'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Pause, Play } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet } from '@/components/ui/sheet';
import { finishSession } from '@/server/sessions';
import { startSession } from '@/server/sessions';

interface SessionControlsProps {
  sessionId: string | null;
  planDayId: string | null;
  totalSets: number;
  doneSets: number;
  totalKg: number;
  startedAt: string | null;
}

export function SessionControls({
  sessionId,
  planDayId,
  totalSets,
  doneSets,
  totalKg,
  startedAt,
}: SessionControlsProps) {
  const router = useRouter();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function start() {
    startTransition(async () => {
      const res = await startSession(planDayId);
      if (res.error) toast.error(res.error);
      else router.refresh();
    });
  }

  const [paused, setPaused] = useState(false);

  function togglePause() {
    if (paused) {
      setPaused(false);
      toast('Тренировка продолжена');
    } else {
      setPaused(true);
      toast('Пауза. Подходы сохранены — продолжайте, когда будете готовы.');
    }
  }

  function finish() {
    if (!sessionId) return;
    setSummaryOpen(true);
  }

  function confirmFinish() {
    if (!sessionId) return;
    startTransition(async () => {
      const res = await finishSession(sessionId);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Тренировка завершена');
        setSummaryOpen(false);
        router.refresh();
      }
    });
  }

  if (!sessionId) {
    return (
      <div className="mt-6 pb-2">
        <button
          onClick={start}
          disabled={isPending}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-black active:scale-[0.985] disabled:opacity-50"
          style={{
            height: 52,
            background: 'linear-gradient(180deg, #3DD668 0%, #2BB955 100%)',
            boxShadow: '0 8px 24px -8px rgba(52,199,89,0.45)',
          }}
        >
          <Play size={15} fill="currentColor" />
          {isPending ? 'Запускаю…' : 'Начать тренировку'}
        </button>
      </div>
    );
  }

  const minutes = startedAt
    ? Math.max(1, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000))
    : 0;

  return (
    <>
      <div className="mt-6 flex gap-2.5 pb-2">
        <button
          onClick={togglePause}
          className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-semibold active:scale-[0.985] transition-colors ${
            paused
              ? 'bg-accent-warning/15 text-accent-warning'
              : 'bg-white/[0.05] text-text-primary'
          }`}
        >
          {paused ? (
            <>
              <Play size={15} fill="currentColor" /> Продолжить
            </>
          ) : (
            <>
              <Pause size={15} fill="currentColor" /> Пауза
            </>
          )}
        </button>
        <button
          onClick={finish}
          disabled={isPending}
          className="flex h-12 flex-[1.6] items-center justify-center rounded-2xl text-sm font-semibold text-white active:scale-[0.985] transition-transform disabled:opacity-50"
          style={{
            background: 'linear-gradient(180deg, #FF4E70 0%, #FF2D55 100%)',
            boxShadow: '0 10px 28px -10px rgba(255,45,85,0.55)',
          }}
        >
          Завершить тренировку
        </button>
      </div>
      <Sheet
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        title="Завершить тренировку?"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2 rounded-[18px] bg-black/30 p-3">
            <div className="text-center">
              <div className="text-[24px] font-bold tabular-nums leading-none">
                {doneSets}
              </div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                Подходов
              </div>
            </div>
            <div className="text-center">
              <div className="text-[24px] font-bold tabular-nums leading-none text-accent-crimson">
                {minutes}
              </div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                Минут
              </div>
            </div>
            <div className="text-center">
              <div className="text-[24px] font-bold tabular-nums leading-none text-accent-green">
                {totalKg.toFixed(0)}
              </div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                Кг
              </div>
            </div>
          </div>
          <div className="text-[12.5px] text-text-tertiary">
            Из {totalSets} запланированных подходов выполнено {doneSets}.
          </div>
          <button
            onClick={confirmFinish}
            disabled={isPending}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-white active:scale-[0.985] disabled:opacity-50"
            style={{
              height: 52,
              background: 'linear-gradient(180deg, #FF4E70 0%, #FF2D55 100%)',
              boxShadow: '0 10px 28px -10px rgba(255,45,85,0.55)',
            }}
          >
            {isPending ? 'Сохраняю…' : 'Завершить'}
          </button>
        </div>
      </Sheet>
    </>
  );
}
