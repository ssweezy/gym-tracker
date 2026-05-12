'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Dumbbell, Flame, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { Stagger, Reveal } from '@/components/motion/stagger';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { completeOnboarding } from './actions';

type Goal = 'hypertrophy' | 'strength' | 'endurance';
type Preset = 'fullbody3' | 'upper_lower' | 'split3';

const PRIMARY_GRADIENT = 'linear-gradient(180deg, #3DD668 0%, #2BB955 100%)';
const PRIMARY_GLOW = '0 8px 24px -8px rgba(52,199,89,0.45)';

const GOALS: Array<{ id: Goal; label: string; hint: string; icon: typeof Dumbbell }> = [
  { id: 'hypertrophy', label: 'Гипертрофия', hint: '8–12 повт · масса', icon: Dumbbell },
  { id: 'strength', label: 'Сила', hint: '5–8 повт · вес', icon: Flame },
  { id: 'endurance', label: 'Выносливость', hint: '12–15 повт · тонус', icon: Repeat },
];

const PRESETS: Array<{
  id: Preset;
  title: string;
  schedule: string;
  description: string;
}> = [
  {
    id: 'fullbody3',
    title: '3 раза / неделю',
    schedule: 'ПН · СР · ПТ',
    description: 'Фуллбоди — всё тело в каждый день. Идеально для старта.',
  },
  {
    id: 'upper_lower',
    title: 'Сплит верх / низ',
    schedule: 'ПН ВТ · ЧТ ПТ',
    description: 'Чередуем верх и низ. Больше объёма на каждую группу.',
  },
  {
    id: 'split3',
    title: 'Сплит 3 дня',
    schedule: 'ПН · СР · ПТ',
    description: 'Грудь+трицепс / спина+бицепс / ноги. Классика.',
  },
];

type Step = 0 | 1 | 2;

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(0);
  const [displayName, setDisplayName] = useState('');
  const [goal, setGoal] = useState<Goal | null>(null);
  const [preset, setPreset] = useState<Preset | null>(null);
  const [pending, start] = useTransition();

  const canAdvance =
    (step === 0 && displayName.trim().length > 0) ||
    (step === 1 && goal !== null) ||
    (step === 2 && preset !== null);

  const next = () => {
    if (!canAdvance) return;
    if (step < 2) {
      setStep((step + 1) as Step);
      return;
    }
    if (!goal || !preset) return;
    const fd = new FormData();
    fd.set('display_name', displayName.trim());
    fd.set('goal', goal);
    fd.set('preset', preset);
    start(async () => {
      const res = await completeOnboarding(fd);
      if (res?.error) toast.error(res.error);
    });
  };

  const back = () => {
    if (step === 0) return;
    setStep((step - 1) as Step);
  };

  const stepLabel = step === 0 ? 'Имя' : step === 1 ? 'Цель' : 'План';

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-12 pb-8">
      <Stagger className="flex flex-1 flex-col">
        <Reveal className="flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
            Шаг {step + 1} из 3 · {stepLabel}
          </div>
          {step > 0 && (
            <button
              type="button"
              onClick={back}
              className="text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              Назад
            </button>
          )}
        </Reveal>

        <Reveal className="mt-3 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors duration-300',
                i <= step ? 'bg-accent-green' : 'bg-white/[0.06]',
              )}
            />
          ))}
        </Reveal>

        <div className="mt-10 flex-1">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.section
                key="name"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <h1
                  className="text-[34px] font-bold leading-[1.05] tracking-[-0.022em]"
                  style={{ fontFeatureSettings: '"ss01", "tnum"' }}
                >
                  Как вас зовут?
                </h1>
                <p className="mt-2 text-[15px] text-text-secondary">
                  Имя будет видно только вам — на главной и в профиле.
                </p>

                <div className="mt-8">
                  <Input
                    name="display_name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Имя"
                    maxLength={50}
                    autoFocus
                    autoComplete="given-name"
                    className="h-13 rounded-2xl bg-white/[0.04] border-white/[0.06] px-4 text-[15px] focus:border-white/20"
                    style={{ height: 52 }}
                  />
                </div>
              </motion.section>
            )}

            {step === 1 && (
              <motion.section
                key="goal"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <h1
                  className="text-[34px] font-bold leading-[1.05] tracking-[-0.022em]"
                  style={{ fontFeatureSettings: '"ss01", "tnum"' }}
                >
                  Ваша цель?
                </h1>
                <p className="mt-2 text-[15px] text-text-secondary">
                  Влияет на диапазоны повторений в новых упражнениях.
                </p>

                <div className="mt-8 space-y-2.5">
                  {GOALS.map((g) => {
                    const selected = goal === g.id;
                    const Icon = g.icon;
                    return (
                      <motion.button
                        key={g.id}
                        type="button"
                        onClick={() => setGoal(g.id)}
                        whileTap={{ scale: 0.985 }}
                        className={cn(
                          'flex w-full items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left transition-colors',
                          selected
                            ? 'border-accent-green/40 bg-accent-green/10'
                            : 'border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.04]',
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                            selected
                              ? 'bg-accent-green/20 text-accent-green'
                              : 'bg-white/[0.06] text-text-secondary',
                          )}
                        >
                          <Icon size={18} strokeWidth={2.2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[15px] font-semibold">{g.label}</div>
                          <div className="mt-0.5 text-[12px] text-text-tertiary tabular-nums">
                            {g.hint}
                          </div>
                        </div>
                        {selected && (
                          <Check size={18} strokeWidth={2.8} className="text-accent-green" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.section>
            )}

            {step === 2 && (
              <motion.section
                key="preset"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <h1
                  className="text-[34px] font-bold leading-[1.05] tracking-[-0.022em]"
                  style={{ fontFeatureSettings: '"ss01", "tnum"' }}
                >
                  Стартовый план
                </h1>
                <p className="mt-2 text-[15px] text-text-secondary">
                  Упражнения можно будет добавить позже в редакторе плана.
                </p>

                <div className="mt-8 space-y-2.5">
                  {PRESETS.map((p) => {
                    const selected = preset === p.id;
                    return (
                      <motion.button
                        key={p.id}
                        type="button"
                        onClick={() => setPreset(p.id)}
                        whileTap={{ scale: 0.99 }}
                        className={cn(
                          'block w-full rounded-2xl border px-4 py-4 text-left transition-colors',
                          selected
                            ? 'border-accent-green/40 bg-accent-green/10'
                            : 'border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.04]',
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[15px] font-semibold">{p.title}</span>
                              <span
                                className={cn(
                                  'rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] tabular-nums',
                                  selected
                                    ? 'bg-accent-green/15 text-accent-green'
                                    : 'bg-white/[0.05] text-text-tertiary',
                                )}
                              >
                                {p.schedule}
                              </span>
                            </div>
                            <p className="mt-1.5 text-[12.5px] leading-snug text-text-tertiary">
                              {p.description}
                            </p>
                          </div>
                          {selected && (
                            <Check
                              size={18}
                              strokeWidth={2.8}
                              className="ml-3 shrink-0 text-accent-green"
                            />
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        <Reveal className="pt-6">
          <motion.button
            type="button"
            onClick={next}
            disabled={!canAdvance || pending}
            whileTap={{ scale: 0.985 }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-black transition-opacity disabled:opacity-40"
            style={{
              height: 52,
              background: PRIMARY_GRADIENT,
              boxShadow: PRIMARY_GLOW,
            }}
          >
            {pending ? (
              '...'
            ) : (
              <>
                {step === 2 ? 'Готово' : 'Дальше'}
                <ArrowRight size={16} strokeWidth={2.5} />
              </>
            )}
          </motion.button>
        </Reveal>
      </Stagger>
    </main>
  );
}
