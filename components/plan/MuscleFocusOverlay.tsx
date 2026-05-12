'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { MUSCLE_LABELS, type MuscleGroup } from '@/lib/volume';
import { cn } from '@/lib/utils';

const WEEKDAY_SHORT = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export interface FocusDayBreakdown {
  weekday: number;
  title: string | null;
  setCount: number;
  contributions: Array<{ name: string; target_sets: number }>;
}

interface MuscleFocusOverlayProps {
  open: boolean;
  onClose: () => void;
  muscleGroup: MuscleGroup | null;
  totalSets: number;
  breakdown: FocusDayBreakdown[];
}

const EASE = [0.22, 1, 0.36, 1] as const;

export function MuscleFocusOverlay({
  open,
  onClose,
  muscleGroup,
  totalSets,
  breakdown,
}: MuscleFocusOverlayProps) {
  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Esc.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const muscleSetCount = new Map<number, number>();
  for (const b of breakdown) muscleSetCount.set(b.weekday, b.setCount);

  return (
    <AnimatePresence>
      {open && muscleGroup && (
        <>
          {/* Backdrop with blur */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{
              backgroundColor: 'rgba(8,8,11,0.55)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          />

          {/* Foreground */}
          <motion.div
            key="foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="fixed inset-0 z-50 flex flex-col overflow-y-auto px-5 pt-6 pb-8 safe-bottom"
          >
            {/* Top: filtered week timeline */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{
                duration: 0.5,
                ease: EASE,
                type: 'spring',
                stiffness: 380,
                damping: 30,
                delay: 0.06,
              }}
            >
              <div className="grid grid-cols-7 gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map((wd) => {
                  const count = muscleSetCount.get(wd) ?? 0;
                  const active = count > 0;
                  return (
                    <div
                      key={wd}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-2xl py-2 transition-colors',
                        active ? 'bg-white/[0.04]' : 'opacity-30',
                      )}
                    >
                      <span
                        className={cn(
                          'text-[10px] font-semibold uppercase tracking-[0.08em]',
                          active
                            ? 'text-accent-green'
                            : 'text-text-tertiary',
                        )}
                      >
                        {WEEKDAY_SHORT[wd]}
                      </span>
                      <div
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-full text-[14px] font-semibold tabular-nums',
                          active
                            ? 'border border-accent-green/40 text-text-primary'
                            : 'text-text-tertiary',
                        )}
                        style={
                          active
                            ? {
                                boxShadow:
                                  'inset 0 0 0 1px rgba(52,199,89,0.18)',
                              }
                            : undefined
                        }
                      >
                        {wd}
                      </div>
                      <span
                        className={cn(
                          'text-[10px] font-medium tabular-nums',
                          active
                            ? 'text-accent-green'
                            : 'text-transparent',
                        )}
                      >
                        {active ? `${count} подх.` : '·'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Middle: header */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE, delay: 0.18 }}
              className="mt-7 flex items-start justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-green">
                  Фокус · {totalSets} подх. / неделя
                </div>
                <h2
                  className="mt-1 text-[34px] font-bold leading-[1.05] tracking-[-0.022em]"
                  style={{ fontFeatureSettings: '"ss01"' }}
                >
                  {MUSCLE_LABELS[muscleGroup]}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-text-primary transition-colors hover:bg-white/[0.12] active:scale-95"
              >
                <X size={18} strokeWidth={2.4} />
              </button>
            </motion.div>

            {/* Bottom: per-day breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{
                duration: 0.5,
                ease: EASE,
                type: 'spring',
                stiffness: 380,
                damping: 30,
                delay: 0.28,
              }}
              className="mt-6 flex-1"
            >
              {breakdown.length === 0 ? (
                <div className="rounded-[22px] bg-white/[0.04] p-6 text-center text-[13px] text-text-tertiary">
                  Нет упражнений на эту группу мышц в плане.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {breakdown.map((b, i) => (
                    <motion.li
                      key={b.weekday}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.4,
                        ease: EASE,
                        delay: 0.36 + i * 0.05,
                      }}
                    >
                      <div className="rounded-[18px] bg-white/[0.05] px-4 py-3.5">
                        <div className="flex items-baseline justify-between">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                            {WEEKDAY_SHORT[b.weekday]}
                            {b.title ? ` · ${b.title}` : ''}
                          </div>
                          <div className="text-[11px] tabular-nums text-accent-green">
                            {b.setCount} подх.
                          </div>
                        </div>
                        <ul className="mt-2 divide-y divide-white/[0.05]">
                          {b.contributions.map((c, ci) => (
                            <li
                              key={ci}
                              className="flex items-baseline justify-between py-1.5 text-[13.5px] tabular-nums"
                            >
                              <span className="truncate pr-3 text-text-primary">
                                {c.name}
                              </span>
                              <span className="shrink-0 text-text-secondary">
                                {c.target_sets}×
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
