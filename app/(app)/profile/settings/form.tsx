'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Stepper } from '@/components/ui/stepper';
import { cn } from '@/lib/utils';
import { tapMedium, tapSoft, tapSuccess, tapError } from '@/lib/haptics';
import { updateProfile } from '@/server/profile';

type Goal = 'hypertrophy' | 'strength' | 'endurance';
type Unit = 'metric' | 'imperial';

const GOALS: { key: Goal; label: string }[] = [
  { key: 'hypertrophy', label: 'Гипертрофия' },
  { key: 'strength', label: 'Сила' },
  { key: 'endurance', label: 'Выносливость' },
];

const UNITS: { key: Unit; label: string }[] = [
  { key: 'metric', label: 'Метрические' },
  { key: 'imperial', label: 'Имперские' },
];

interface Initial {
  display_name: string;
  goal: Goal;
  unit_system: Unit;
  bodyweight_kg: number | null;
}

export function SettingsForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [name, setName] = useState(initial.display_name);
  const [goal, setGoal] = useState<Goal>(initial.goal);
  const [unit, setUnit] = useState<Unit>(initial.unit_system);
  const [hasBw, setHasBw] = useState(initial.bodyweight_kg != null);
  const [bw, setBw] = useState<number>(initial.bodyweight_kg ?? 75);
  const [pending, start] = useTransition();

  function save() {
    tapMedium();
    start(async () => {
      const res = await updateProfile({
        display_name: name,
        goal,
        unit_system: unit,
        bodyweight_kg: hasBw ? bw : null,
      });
      if (res?.error) {
        tapError();
        toast.error(res.error);
        return;
      }
      tapSuccess();
      toast.success('Сохранено');
      router.push('/profile');
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
          Имя
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Как вас зовут"
          className="mt-2"
          maxLength={40}
        />
      </div>

      <div>
        <label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
          Цель
        </label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {GOALS.map((g) => {
            const active = goal === g.key;
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => {
                  tapSoft();
                  setGoal(g.key);
                }}
                className={cn(
                  'flex h-11 items-center justify-center rounded-2xl px-2 text-[12.5px] font-semibold transition-all active:scale-95',
                  active
                    ? 'bg-accent-green/15 text-accent-green ring-1 ring-accent-green/50'
                    : 'bg-white/[0.05] text-text-secondary',
                )}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
          Единицы измерения
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {UNITS.map((u) => {
            const active = unit === u.key;
            return (
              <button
                key={u.key}
                type="button"
                onClick={() => {
                  tapSoft();
                  setUnit(u.key);
                }}
                className={cn(
                  'flex h-11 items-center justify-center rounded-2xl text-[13px] font-semibold transition-all active:scale-95',
                  active
                    ? 'bg-accent-green/15 text-accent-green ring-1 ring-accent-green/50'
                    : 'bg-white/[0.05] text-text-secondary',
                )}
              >
                {u.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
            Вес тела
          </label>
          <button
            type="button"
            onClick={() => {
              tapSoft();
              setHasBw((v) => !v);
            }}
            className={cn(
              'rounded-full px-3 py-1 text-[12px] font-semibold transition-all active:scale-95',
              hasBw
                ? 'bg-white/[0.06] text-text-secondary'
                : 'bg-accent-green/15 text-accent-green',
            )}
          >
            {hasBw ? 'Указан' : 'Не указывать'}
          </button>
        </div>
        {hasBw && (
          <div className="mt-3 flex justify-center">
            <Stepper
              value={bw}
              onChange={setBw}
              min={20}
              max={400}
              step={0.5}
              precision={1}
              unit="кг"
            />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={pending || !name.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-black active:scale-[0.985] transition-transform disabled:opacity-50"
        style={{
          height: 52,
          background: 'linear-gradient(180deg, #3DD668 0%, #2BB955 100%)',
          boxShadow: '0 8px 24px -8px rgba(52,199,89,0.45)',
        }}
      >
        {pending ? 'Сохраняю…' : 'Сохранить'}
      </button>
    </div>
  );
}
