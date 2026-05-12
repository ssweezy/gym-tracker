'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Sheet } from '@/components/ui/sheet';
import { Stepper } from '@/components/ui/stepper';
import { RepCategoryPicker } from '@/components/plan/RepCategoryPicker';
import { addExerciseToPlanDay } from '@/server/plan-actions';
import { cn } from '@/lib/utils';
import type { RepCategory } from '@/lib/progression';

export interface AddToPlanDayOption {
  id: string;
  weekday: number;
  title: string | null;
  is_rest: boolean;
}

const WEEKDAY_SHORT = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface AddToPlanSheetProps {
  exerciseId: string;
  exerciseName: string;
  days: AddToPlanDayOption[];
}

export function AddToPlanSheet({ exerciseId, exerciseName, days }: AddToPlanSheetProps) {
  const [open, setOpen] = useState(false);
  const initialDay = days.find((d) => !d.is_rest)?.id ?? days[0]?.id ?? '';
  const [dayId, setDayId] = useState(initialDay);
  const [category, setCategory] = useState<RepCategory>('classic');
  const [sets, setSets] = useState(3);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!dayId) {
      toast.error('Выберите день');
      return;
    }
    startTransition(async () => {
      const res = await addExerciseToPlanDay(dayId, exerciseId, category, sets);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`«${exerciseName}» добавлено в план`);
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-black active:scale-[0.985] transition-transform"
        style={{
          height: 52,
          background: 'linear-gradient(180deg, #3DD668 0%, #2BB955 100%)',
          boxShadow: '0 8px 24px -8px rgba(52,199,89,0.45)',
        }}
      >
        Добавить в план
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Добавить в план">
        <div className="space-y-5">
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
              Тренировочный день
            </h3>
            <div className="mt-2 grid grid-cols-1 gap-2">
              {days.length === 0 && (
                <div className="text-[13px] text-text-tertiary">
                  В плане ещё нет дней.
                </div>
              )}
              {days.map((d) => {
                const active = d.id === dayId;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDayId(d.id)}
                    disabled={d.is_rest}
                    className={cn(
                      'flex items-center justify-between rounded-2xl px-4 py-3 text-left transition-all',
                      d.is_rest && 'opacity-40',
                      active
                        ? 'bg-accent-green/12 ring-1 ring-accent-green/50'
                        : 'bg-white/[0.04] hover:bg-white/[0.07]',
                    )}
                  >
                    <div>
                      <div className="text-[14px] font-semibold">
                        {WEEKDAY_SHORT[d.weekday]} ·{' '}
                        {d.is_rest ? 'Отдых' : d.title || 'Тренировка'}
                      </div>
                    </div>
                    {active && (
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-accent-green">
                        Выбрано
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

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

          <button
            onClick={submit}
            disabled={isPending || !dayId}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-black active:scale-[0.985] transition-transform disabled:opacity-50"
            style={{
              height: 52,
              background: 'linear-gradient(180deg, #3DD668 0%, #2BB955 100%)',
              boxShadow: '0 8px 24px -8px rgba(52,199,89,0.45)',
            }}
          >
            {isPending ? 'Добавляю…' : 'Сохранить'}
          </button>
        </div>
      </Sheet>
    </>
  );
}
