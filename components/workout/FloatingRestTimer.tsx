'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Pause, Play, Plus, X } from 'lucide-react';
import { useRestTimer } from './RestTimerContext';
import { tapSoft } from '@/lib/haptics';

export function FloatingRestTimer() {
  const { active, paused, remaining, duration, endRest, addTime, togglePause } =
    useRestTimer();

  const finished = active && !paused && remaining === 0;
  const pct = duration > 0 ? remaining / duration : 0;

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const timeText = `${mm}:${ss.toString().padStart(2, '0')}`;

  // Inline SVG ring around the time
  const size = 52;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ y: 24, opacity: 0, scale: 0.94 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="fixed z-50 -translate-x-1/2"
          style={{
            left: 'calc(50% - 6rem)',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.25rem)',
          }}
        >
          <div
            className={`flex items-center gap-2 rounded-full border border-white/[0.08] py-2 pl-2 pr-2.5 shadow-2xl backdrop-blur-2xl ${
              finished
                ? 'bg-accent-green/30'
                : paused
                  ? 'bg-accent-warning/15'
                  : 'bg-bg-elevated/95'
            }`}
            style={{
              // Fixed total width so the pill never reflows when label/icons
              // change (ОТДЫХ → ПАУЗА → ГОТОВО, pause icon → play, etc.).
              width: '300px',
              boxSizing: 'border-box',
              WebkitBackdropFilter: 'blur(24px) saturate(150%)',
              boxShadow: finished
                ? '0 14px 40px -10px rgba(52,199,89,0.55)'
                : '0 14px 40px -12px rgba(0,0,0,0.6)',
            }}
          >
            {/* Ring + time */}
            <div className="relative shrink-0" style={{ width: size, height: size }}>
              <svg width={size} height={size}>
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke="rgba(255,255,255,0.10)"
                  strokeWidth={stroke}
                  fill="none"
                />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={
                    finished ? '#FFFFFF' : paused ? '#FF9500' : '#34C759'
                  }
                  strokeWidth={stroke}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={c}
                  strokeDashoffset={offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  style={{ transition: 'stroke-dashoffset 0.3s linear' }}
                />
              </svg>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span
                  className={`text-[14px] font-bold leading-none tabular-nums ${
                    finished ? 'text-white' : 'text-text-primary'
                  }`}
                  style={{ fontFeatureSettings: '"tnum"' }}
                >
                  {timeText}
                </span>
              </div>
            </div>

            {/* Status / label — flex-1 absorbs the variable space; truncate
                guards against any overflow if locale or stylistic changes
                widen the text. */}
            <span
              className={`flex-1 min-w-0 truncate text-[12.5px] font-semibold uppercase tracking-[0.08em] ${
                finished
                  ? 'text-white'
                  : paused
                    ? 'text-accent-warning'
                    : 'text-text-secondary'
              }`}
            >
              {finished ? 'Готово' : paused ? 'Пауза' : 'Отдых'}
            </span>

            {/* +15s */}
            <button
              type="button"
              onClick={() => {
                tapSoft();
                addTime(15);
              }}
              aria-label="+15 секунд"
              className={`flex h-10 shrink-0 items-center gap-0.5 rounded-full bg-white/[0.06] px-2.5 text-[12.5px] font-semibold tabular-nums active:scale-95 transition-transform ${
                finished ? 'text-white' : 'text-text-primary'
              }`}
            >
              <Plus size={13} strokeWidth={2.8} />
              15
            </button>

            {/* Pause / resume — always rendered so the pill width never reflows.
                Disabled when the rest already hit zero. */}
            <button
              type="button"
              onClick={() => {
                tapSoft();
                togglePause();
              }}
              disabled={finished}
              aria-label={paused ? 'Продолжить отдых' : 'Поставить на паузу'}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:scale-95 transition-all disabled:opacity-30 disabled:active:scale-100 ${
                paused
                  ? 'bg-accent-warning/25 text-accent-warning hover:bg-accent-warning/35'
                  : finished
                    ? 'bg-white/10 text-white'
                    : 'bg-white/[0.06] text-text-primary hover:bg-white/[0.10]'
              }`}
            >
              {paused ? (
                <Play size={16} strokeWidth={2.6} fill="currentColor" />
              ) : (
                <Pause size={16} strokeWidth={2.6} fill="currentColor" />
              )}
            </button>

            {/* Close / end */}
            <button
              type="button"
              onClick={() => {
                tapSoft();
                endRest();
              }}
              aria-label="Завершить отдых"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:scale-95 transition-all ${
                finished
                  ? 'bg-white/20 text-white hover:bg-white/30'
                  : 'bg-white/[0.06] text-text-secondary hover:bg-white/[0.10]'
              }`}
            >
              <X size={17} strokeWidth={2.6} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
