'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { Check, Plus, Search, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Stepper } from '@/components/ui/stepper';
import { MUSCLE_LABELS, type MuscleGroup } from '@/lib/volume';
import { cn } from '@/lib/utils';
import { tapMedium, tapError, tapSuccess, tapSoft } from '@/lib/haptics';
import { createCustomExerciseAction } from './actions';

const MUSCLE_OPTIONS: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'traps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
];

export interface LibraryExercise {
  id: string;
  name: string;
  muscle_groups: string[];
  sub_muscles: string[] | null;
  increment_kg: number;
  description: string | null;
  technique_tips: string[] | null;
  historical_fact: string | null;
}

export function NewExerciseForm({ library }: { library: LibraryExercise[] }) {
  const [name, setName] = useState('');
  const [muscles, setMuscles] = useState<MuscleGroup[]>([]);
  const [increment, setIncrement] = useState(2.5);
  const [description, setDescription] = useState('');
  const [tips, setTips] = useState<string[]>(['']);
  const [historicalFact, setHistoricalFact] = useState('');
  // Carried from a library pick so the precise sub-muscle tags survive.
  const [subMuscles, setSubMuscles] = useState<string[]>([]);
  const [fromLibrary, setFromLibrary] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Hard guard against double-submit. `isPending` from useTransition flips
  // async, so a rapid second tap can fire before the disabled state lands.
  const submittingRef = useRef(false);

  // --- Library picker state ---
  const [libMuscle, setLibMuscle] = useState<MuscleGroup | null>(null);
  const [libQuery, setLibQuery] = useState('');

  const libFiltered = useMemo(() => {
    const q = libQuery.trim().toLowerCase();
    return library
      .filter((ex) =>
        libMuscle ? ex.muscle_groups.includes(libMuscle) : true,
      )
      .filter((ex) => {
        if (!q) return true;
        if (ex.name.toLowerCase().includes(q)) return true;
        return (ex.sub_muscles ?? []).some((s) =>
          s.toLowerCase().includes(q),
        );
      })
      .slice(0, 40);
  }, [library, libMuscle, libQuery]);

  function toggleMuscle(m: MuscleGroup) {
    setMuscles((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  }

  function pickFromLibrary(ex: LibraryExercise) {
    tapSoft();
    setName(ex.name);
    setMuscles(
      ex.muscle_groups.filter((m): m is MuscleGroup =>
        (MUSCLE_OPTIONS as string[]).includes(m),
      ),
    );
    setIncrement(ex.increment_kg);
    setDescription(ex.description ?? '');
    setTips(ex.technique_tips && ex.technique_tips.length > 0 ? ex.technique_tips : ['']);
    setHistoricalFact(ex.historical_fact ?? '');
    setSubMuscles(ex.sub_muscles ?? []);
    setFromLibrary(ex.name);
    toast.success('Заполнено из библиотеки — отредактируйте при желании');
  }

  function submit() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    tapMedium();
    startTransition(async () => {
      const res = await createCustomExerciseAction({
        name,
        muscle_groups: muscles,
        increment_kg: increment,
        description: description || undefined,
        technique_tips: tips.filter((t) => t.trim()),
        historical_fact: historicalFact || undefined,
        sub_muscles: subMuscles.length > 0 ? subMuscles : undefined,
      });
      if (res?.error) {
        submittingRef.current = false;
        tapError();
        toast.error(res.error);
        return;
      }
      tapSuccess();
    });
  }

  return (
    <form
      // Never auto-submit. Pressing Enter in any field (name, technique tip)
      // used to fire `submit()` and silently create the exercise — the
      // "spontaneous save" bug. Creation is now ONLY via the explicit button.
      onSubmit={(e) => e.preventDefault()}
      className="space-y-6"
    >
      {/* ── Library picker ─────────────────────────────────────────── */}
      <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-accent-green" strokeWidth={2.4} />
          <span className="text-[13px] font-semibold">Из библиотеки</span>
        </div>
        <p className="mt-1 text-[12px] text-text-tertiary">
          Выберите мышцу — подставим всё автоматически
        </p>

        <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden">
          {MUSCLE_OPTIONS.map((m) => {
            const active = libMuscle === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  tapSoft();
                  setLibMuscle(active ? null : m);
                }}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-all active:scale-95',
                  active
                    ? 'bg-text-primary text-bg'
                    : 'bg-white/[0.05] text-text-secondary',
                )}
              >
                {MUSCLE_LABELS[m]}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex h-11 items-center gap-2.5 rounded-2xl bg-white/[0.05] px-3.5">
          <Search size={15} className="text-text-tertiary" strokeWidth={2.2} />
          <input
            value={libQuery}
            onChange={(e) => setLibQuery(e.target.value)}
            placeholder="Поиск по названию или мышце"
            className="flex-1 bg-transparent text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
          />
          {libQuery && (
            <button
              type="button"
              onClick={() => setLibQuery('')}
              aria-label="Очистить"
              className="text-text-tertiary"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {(libMuscle || libQuery.trim()) && (
          <ul className="mt-3 max-h-72 divide-y divide-white/[0.04] overflow-y-auto rounded-2xl bg-white/[0.02]">
            {libFiltered.length === 0 && (
              <li className="px-4 py-8 text-center text-[13px] text-text-tertiary">
                Ничего не найдено
              </li>
            )}
            {libFiltered.map((ex) => (
              <li key={ex.id}>
                <button
                  type="button"
                  onClick={() => pickFromLibrary(ex)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-white/[0.03]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-[14px] font-semibold">
                      {ex.name}
                    </div>
                    <div className="mt-0.5 truncate text-[11.5px] text-text-tertiary">
                      {(ex.sub_muscles && ex.sub_muscles.length > 0
                        ? ex.sub_muscles
                        : ex.muscle_groups.map(
                            (g) => MUSCLE_LABELS[g as MuscleGroup] ?? g,
                          )
                      ).join(' · ')}
                    </div>
                  </div>
                  {fromLibrary === ex.name ? (
                    <Check
                      size={16}
                      className="shrink-0 text-accent-green"
                      strokeWidth={2.6}
                    />
                  ) : (
                    <Plus
                      size={16}
                      className="shrink-0 text-text-tertiary"
                      strokeWidth={2.4}
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {fromLibrary && (
        <div className="-mt-2 flex items-center gap-1.5 px-1 text-[11.5px] text-accent-green">
          <Check size={12} strokeWidth={2.6} />
          Заполнено из «{fromLibrary}» — измените что нужно ниже
        </div>
      )}

      {/* ── Form fields ────────────────────────────────────────────── */}
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
        type="button"
        onClick={submit}
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
