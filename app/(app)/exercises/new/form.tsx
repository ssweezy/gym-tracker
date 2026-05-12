'use client';

import { useState, useTransition } from 'react';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Stepper } from '@/components/ui/stepper';
import { MUSCLE_LABELS, type MuscleGroup } from '@/lib/volume';
import { cn } from '@/lib/utils';
import { createCustomExerciseAction } from './actions';

const MUSCLE_OPTIONS: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
];

export function NewExerciseForm() {
  const [name, setName] = useState('');
  const [muscles, setMuscles] = useState<MuscleGroup[]>([]);
  const [increment, setIncrement] = useState(2.5);
  const [description, setDescription] = useState('');
  const [tips, setTips] = useState<string[]>(['']);
  const [historicalFact, setHistoricalFact] = useState('');
  const [isPending, startTransition] = useTransition();

  function toggleMuscle(m: MuscleGroup) {
    setMuscles((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  }

  function submit() {
    startTransition(async () => {
      const res = await createCustomExerciseAction({
        name,
        muscle_groups: muscles,
        increment_kg: increment,
        description: description || undefined,
        technique_tips: tips.filter((t) => t.trim()),
        historical_fact: historicalFact || undefined,
      });
      if (res?.error) toast.error(res.error);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-6"
    >
      <div>
        <label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
          Название
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например, Тяга нижнего блока"
          className="mt-2"
          required
        />
      </div>

      <div>
        <label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
          Группы мышц
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {MUSCLE_OPTIONS.map((m) => {
            const active = muscles.includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => toggleMuscle(m)}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-all active:scale-95',
                  active
                    ? 'bg-accent-green/15 text-accent-green ring-1 ring-accent-green/50'
                    : 'bg-white/[0.05] text-text-secondary hover:bg-white/[0.08]',
                )}
              >
                {MUSCLE_LABELS[m]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
          Шаг веса (кг)
        </label>
        <div className="mt-2 flex justify-center">
          <Stepper
            value={increment}
            onChange={setIncrement}
            min={0.5}
            max={20}
            step={0.5}
            precision={1}
            unit="кг"
          />
        </div>
      </div>

      <div>
        <label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
          Описание
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-xl border border-border bg-bg-elevated px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:border-text-secondary focus:outline-none transition-colors"
          placeholder="Что это за упражнение и какие мышцы прорабатывает"
        />
      </div>

      <div>
        <label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
          Техника
        </label>
        <div className="mt-2 space-y-2">
          {tips.map((tip, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-green/15 text-[11px] font-semibold tabular-nums text-accent-green">
                {i + 1}
              </span>
              <Input
                value={tip}
                onChange={(e) => {
                  const next = [...tips];
                  next[i] = e.target.value;
                  setTips(next);
                }}
                placeholder="Подсказка по технике"
                className="h-11"
              />
              {tips.length > 1 && (
                <button
                  type="button"
                  onClick={() => setTips(tips.filter((_, idx) => idx !== i))}
                  className="text-text-tertiary"
                  aria-label="Удалить"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setTips([...tips, ''])}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.08] text-[13px] font-semibold text-text-secondary hover:bg-white/[0.02] transition-colors"
          >
            <Plus size={14} /> Добавить пункт
          </button>
        </div>
      </div>

      <div>
        <label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
          Исторический факт (опционально)
        </label>
        <textarea
          value={historicalFact}
          onChange={(e) => setHistoricalFact(e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-xl border border-border bg-bg-elevated px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:border-text-secondary focus:outline-none transition-colors"
          placeholder="Интересный факт об упражнении"
        />
      </div>

      <button
        type="submit"
        disabled={isPending || !name.trim() || muscles.length === 0}
        className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-black active:scale-[0.985] transition-transform disabled:opacity-50"
        style={{
          height: 52,
          background: 'linear-gradient(180deg, #3DD668 0%, #2BB955 100%)',
          boxShadow: '0 8px 24px -8px rgba(52,199,89,0.45)',
        }}
      >
        {isPending ? 'Сохраняю…' : 'Создать упражнение'}
      </button>
    </form>
  );
}
