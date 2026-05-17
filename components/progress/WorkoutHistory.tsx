'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Clock, Layers, Trash2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Reveal } from '@/components/motion/stagger';
import { deleteWorkout, resetAllWorkouts } from '@/server/history';
import { tapMedium, tapSuccess, tapError } from '@/lib/haptics';
import type { WorkoutHistoryItem } from '@/server/types';

const RU_MONTHS_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${RU_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtDur(min: number): string {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`;
}

export function WorkoutHistory({ items }: { items: WorkoutHistoryItem[] }) {
  const router = useRouter();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [pending, start] = useTransition();

  function remove(id: string) {
    tapMedium();
    start(async () => {
      const res = await deleteWorkout(id);
      if (res.error) {
        tapError();
        toast.error(res.error);
        return;
      }
      tapSuccess();
      toast.success('Тренировка удалена');
      setConfirmId(null);
      router.refresh();
    });
  }

  function resetAll() {
    tapMedium();
    start(async () => {
      const res = await resetAllWorkouts();
      if (res.error) {
        tapError();
        toast.error(res.error);
        return;
      }
      tapSuccess();
      toast.success('История очищена — новый сезон');
      setResetting(false);
      router.refresh();
    });
  }

  return (
    <>
      <Reveal className="mt-7 flex items-baseline justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          История тренировок
        </h2>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => {
              tapMedium();
              setResetting(true);
            }}
            className="text-[12px] font-semibold text-accent-crimson active:opacity-70"
          >
            Новый сезон
          </button>
        )}
      </Reveal>

      {resetting && (
        <Reveal className="mt-3">
          <div className="overflow-hidden rounded-[22px] bg-bg-elevated p-5">
            <div className="flex items-center gap-2 text-[14px] font-semibold">
              <TriangleAlert size={16} className="text-accent-crimson" />
              Очистить всю историю?
            </div>
            <p className="mt-1.5 text-[12.5px] text-text-tertiary">
              Все тренировки и записанные подходы будут удалены безвозвратно.
              Планы и упражнения останутся. Статистика обнулится — как новый
              сезон.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setResetting(false)}
                disabled={pending}
                className="flex h-11 flex-1 items-center justify-center rounded-2xl bg-white/[0.05] text-[14px] font-semibold text-text-primary active:scale-[0.985] disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={resetAll}
                disabled={pending}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl text-[14px] font-semibold text-white active:scale-[0.985] disabled:opacity-50"
                style={{
                  background: 'linear-gradient(180deg, #FF4E70 0%, #FF2D55 100%)',
                  boxShadow: '0 8px 24px -8px rgba(255,45,85,0.45)',
                }}
              >
                <Trash2 size={15} strokeWidth={2.4} />
                {pending ? 'Очищаю…' : 'Очистить всё'}
              </button>
            </div>
          </div>
        </Reveal>
      )}

      <Reveal className="mt-3 pb-2">
        <div className="overflow-hidden rounded-[22px] bg-bg-elevated">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px] text-text-tertiary">
              Пока нет завершённых тренировок.
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {items.map((w) => (
                <li key={w.id} className="px-4 py-3.5">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                          {fmtDate(w.finished_at)}
                        </span>
                      </div>
                      <h3 className="mt-1 truncate text-[15px] font-semibold tracking-tight">
                        {w.title}
                      </h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-text-tertiary tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} /> {fmtDur(w.duration_min)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Layers size={11} /> {w.set_count} подх.
                        </span>
                        {w.tonnage_kg > 0 && (
                          <span>
                            {(w.tonnage_kg / 1000).toFixed(1).replace('.', ',')} т
                          </span>
                        )}
                      </div>
                      {w.exercises.length > 0 && (
                        <p className="mt-1.5 line-clamp-2 text-[12px] text-text-secondary">
                          {w.exercises.join(' · ')}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        tapMedium();
                        setConfirmId(confirmId === w.id ? null : w.id);
                      }}
                      aria-label="Удалить тренировку"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-text-tertiary active:scale-90 transition-transform"
                    >
                      <Trash2 size={14} strokeWidth={2.2} />
                    </button>
                  </div>

                  {confirmId === w.id && (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        disabled={pending}
                        className="flex h-10 flex-1 items-center justify-center rounded-xl bg-white/[0.05] text-[13px] font-semibold text-text-primary active:scale-[0.985] disabled:opacity-50"
                      >
                        Отмена
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(w.id)}
                        disabled={pending}
                        className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent-crimson/15 text-[13px] font-semibold text-accent-crimson active:scale-[0.985] disabled:opacity-50"
                      >
                        <Trash2 size={13} strokeWidth={2.4} />
                        {pending ? 'Удаляю…' : 'Удалить'}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Reveal>
    </>
  );
}
