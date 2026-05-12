'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RefreshCcw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PRESETS = [60, 90, 120, 180];

interface RestTimerProps {
  open: boolean;
  onClose: () => void;
}

export function RestTimer({ open, onClose }: RestTimerProps) {
  const [duration, setDuration] = useState(90);
  const [remaining, setRemaining] = useState(90);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setRunning(false);
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate?.(200);
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  useEffect(() => {
    if (!open) {
      setRunning(false);
      setRemaining(duration);
    }
  }, [open, duration]);

  function pickPreset(seconds: number) {
    setDuration(seconds);
    setRemaining(seconds);
    setRunning(true);
  }

  function reset() {
    setRunning(false);
    setRemaining(duration);
  }

  const pct = duration > 0 ? remaining / duration : 0;
  const size = 220;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-bg-elevated safe-bottom"
          >
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="text-[20px] font-semibold">Отдых</h2>
              <button
                onClick={onClose}
                className="text-text-secondary p-1 active:scale-90"
                aria-label="Закрыть"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex flex-col items-center px-5 py-8">
              <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={stroke}
                    fill="none"
                  />
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#34C759"
                    strokeWidth={stroke}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{ transition: 'stroke-dashoffset 0.4s linear' }}
                  />
                </svg>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-tertiary">
                    Осталось
                  </span>
                  <span
                    className="mt-1 text-[44px] font-bold leading-none tabular-nums"
                    style={{ fontFeatureSettings: '"tnum"' }}
                  >
                    {mm}:{ss.toString().padStart(2, '0')}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid w-full grid-cols-4 gap-2">
                {PRESETS.map((s) => (
                  <button
                    key={s}
                    onClick={() => pickPreset(s)}
                    className={
                      'rounded-2xl px-2 py-2.5 text-[13px] font-semibold transition-all active:scale-95 ' +
                      (duration === s
                        ? 'bg-accent-green/15 text-accent-green ring-1 ring-accent-green/50'
                        : 'bg-white/[0.05] text-text-secondary')
                    }
                  >
                    {Math.floor(s / 60)}:{(s % 60).toString().padStart(2, '0')}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex w-full gap-2">
                <button
                  onClick={reset}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-white/[0.05] text-[14px] font-semibold text-text-primary active:scale-[0.985]"
                >
                  <RefreshCcw size={15} /> Сброс
                </button>
                <button
                  onClick={() => setRunning((r) => !r)}
                  className="flex h-12 flex-[1.6] items-center justify-center gap-2 rounded-2xl text-[14px] font-semibold text-black active:scale-[0.985]"
                  style={{
                    background: 'linear-gradient(180deg, #3DD668 0%, #2BB955 100%)',
                    boxShadow: '0 8px 24px -8px rgba(52,199,89,0.45)',
                  }}
                >
                  {running ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
                  {running ? 'Пауза' : 'Старт'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
