'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { tapSoft } from '@/lib/haptics';

interface WeightFieldProps {
  value: number;
  onChange: (next: number) => void;
  /** Default step for both directions; per-exercise overrides persist. */
  defaultStep: number;
  /** Used to persist the +/- step preferences per exercise. */
  exerciseId: string;
}

function parseNum(raw: string): number | null {
  const n = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const round1 = (n: number) => +n.toFixed(1);

/**
 * Tappable weight control. The big number opens a blurred modal with three
 * fields: exact weight, the «+» step and the «−» step (the up/down increments
 * can differ — e.g. +5 to add a plate, −2.5 to back off).
 */
export function WeightField({
  value,
  onChange,
  defaultStep,
  exerciseId,
}: WeightFieldProps) {
  const storeKey = `weight-steps:${exerciseId}`;
  const [stepUp, setStepUp] = useState(defaultStep);
  const [stepDown, setStepDown] = useState(defaultStep);
  const [open, setOpen] = useState(false);

  // Draft fields for the modal.
  const [draftWeight, setDraftWeight] = useState('');
  const [draftUp, setDraftUp] = useState('');
  const [draftDown, setDraftDown] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) {
        const s = JSON.parse(raw) as { up?: number; down?: number };
        if (typeof s.up === 'number') setStepUp(s.up);
        if (typeof s.down === 'number') setStepDown(s.down);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeKey]);

  function persistSteps(up: number, down: number) {
    try {
      localStorage.setItem(storeKey, JSON.stringify({ up, down }));
    } catch {
      /* ignore */
    }
  }

  function openModal() {
    tapSoft();
    setDraftWeight(String(value).replace('.', ','));
    setDraftUp(String(stepUp).replace('.', ','));
    setDraftDown(String(stepDown).replace('.', ','));
    setOpen(true);
  }

  function applyModal() {
    const w = parseNum(draftWeight);
    const up = parseNum(draftUp);
    const down = parseNum(draftDown);
    if (w !== null && w >= 0) onChange(round1(w));
    const nextUp = up !== null && up > 0 ? round1(up) : stepUp;
    const nextDown = down !== null && down > 0 ? round1(down) : stepDown;
    setStepUp(nextUp);
    setStepDown(nextDown);
    persistSteps(nextUp, nextDown);
    tapSoft();
    setOpen(false);
  }

  return (
    <>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            tapSoft();
            onChange(Math.max(0, round1(value - stepDown)));
          }}
          disabled={value <= 0}
          aria-label={`Минус ${stepDown} кг`}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-bg text-text-primary active:scale-95 disabled:opacity-30 transition-transform"
        >
          <Minus size={20} />
          <span className="sr-only">{stepDown}</span>
        </button>

        <button
          type="button"
          onClick={openModal}
          className="min-w-[120px] rounded-2xl px-2 py-1 text-center active:scale-[0.97] transition-transform"
          aria-label="Ввести вес вручную"
        >
          <span className="text-3xl font-semibold tabular-nums">
            {value.toFixed(1).replace('.', ',')}
            <span className="ml-1 text-lg text-text-secondary">кг</span>
          </span>
          <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.1em] text-text-tertiary">
            −{stepDown} · +{stepUp}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            tapSoft();
            onChange(round1(value + stepUp));
          }}
          aria-label={`Плюс ${stepUp} кг`}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-bg text-text-primary active:scale-95 transition-transform"
        >
          <Plus size={20} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[60] bg-black/55"
              style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
            />
            <div className="fixed inset-0 z-[61] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 8 }}
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                className="w-full max-w-[340px] overflow-hidden rounded-[26px] border border-white/[0.08] bg-bg-elevated p-5 shadow-2xl"
                style={{ boxShadow: '0 24px 60px -16px rgba(0,0,0,0.7)' }}
              >
                <h3 className="text-[17px] font-semibold tracking-tight">Вес</h3>
                <p className="mt-0.5 text-[12px] text-text-tertiary">
                  Точное значение и шаги кнопок
                </p>

                <div className="mt-4 space-y-3">
                  <Field
                    label="Точный вес, кг"
                    value={draftWeight}
                    onChange={setDraftWeight}
                    autoFocus
                    accent
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Шаг для −"
                      value={draftDown}
                      onChange={setDraftDown}
                    />
                    <Field
                      label="Шаг для +"
                      value={draftUp}
                      onChange={setDraftUp}
                    />
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-white/[0.05] text-[14px] font-semibold text-text-primary active:scale-[0.985]"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={applyModal}
                    className="flex h-12 flex-[1.4] items-center justify-center rounded-2xl text-[15px] font-semibold text-black active:scale-[0.985]"
                    style={{
                      background:
                        'linear-gradient(180deg, #3DD668 0%, #2BB955 100%)',
                      boxShadow: '0 8px 24px -8px rgba(52,199,89,0.45)',
                    }}
                  >
                    Готово
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  autoFocus,
  accent,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  accent?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
        {label}
      </span>
      <input
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        className={`mt-1.5 h-12 w-full rounded-xl border border-border bg-bg px-3.5 tabular-nums text-text-primary focus:border-text-secondary focus:outline-none transition-colors ${
          accent ? 'text-[22px] font-semibold' : 'text-[16px] font-medium'
        }`}
      />
    </label>
  );
}
