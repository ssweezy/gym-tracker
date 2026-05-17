'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue } from 'framer-motion';
import { ChevronDown, Pause, Play, Plus, X } from 'lucide-react';
import { useRestTimer } from './RestTimerContext';
import { tapSoft } from '@/lib/haptics';

const POS_KEY = 'rest-timer-pos';
const MIN_KEY = 'rest-timer-min';

export function FloatingRestTimer() {
  const { active, paused, remaining, duration, endRest, addTime, togglePause } =
    useRestTimer();

  // Drag offset from the default anchor, persisted so the user only has to
  // place the islet once. Constrained to the viewport on every drag end.
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const [minimized, setMinimized] = useState(false);

  // Restore persisted position + minimized state once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { x: number; y: number };
        if (typeof p.x === 'number') x.set(p.x);
        if (typeof p.y === 'number') y.set(p.y);
      }
      setMinimized(localStorage.getItem(MIN_KEY) === '1');
    } catch {
      /* ignore corrupt storage */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persistPos() {
    try {
      localStorage.setItem(
        POS_KEY,
        JSON.stringify({ x: x.get(), y: y.get() }),
      );
    } catch {
      /* ignore */
    }
  }

  function setMin(v: boolean) {
    setMinimized(v);
    try {
      localStorage.setItem(MIN_KEY, v ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  const finished = active && !paused && remaining === 0;
  const pct = duration > 0 ? remaining / duration : 0;

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const timeText = `${mm}:${ss.toString().padStart(2, '0')}`;

  const size = 52;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);

  const ringColor = finished ? '#FFFFFF' : paused ? '#FF9500' : '#34C759';

  const Ring = (
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
          stroke={ringColor}
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
  );

  return (
    // Full-screen, non-interactive layer used only as the drag boundary so the
    // islet can be dropped anywhere but never off-screen.
    <div
      ref={constraintsRef}
      className="pointer-events-none fixed inset-0 z-50"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4.5rem)',
      }}
    >
      <AnimatePresence>
        {active && (
          <motion.div
            drag
            dragConstraints={constraintsRef}
            dragMomentum={false}
            dragElastic={0.05}
            onDragEnd={persistPos}
            style={{
              x,
              y,
              left: 0,
              right: 0,
              marginLeft: 'auto',
              marginRight: 'auto',
              bottom: '1.25rem',
              width: minimized ? size + 16 : 312,
            }}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="pointer-events-auto absolute touch-none"
          >
            {minimized ? (
              // Compact puck — tap to expand, still draggable.
              <button
                type="button"
                onClick={() => {
                  tapSoft();
                  setMin(false);
                }}
                aria-label="Развернуть таймер отдыха"
                className={`flex items-center justify-center rounded-full border border-white/[0.08] p-2 shadow-2xl backdrop-blur-2xl active:scale-95 transition-transform ${
                  finished
                    ? 'bg-accent-green/30'
                    : paused
                      ? 'bg-accent-warning/15'
                      : 'bg-bg-elevated/95'
                }`}
                style={{
                  WebkitBackdropFilter: 'blur(24px) saturate(150%)',
                  boxShadow: finished
                    ? '0 14px 40px -10px rgba(52,199,89,0.55)'
                    : '0 14px 40px -12px rgba(0,0,0,0.6)',
                }}
              >
                {Ring}
              </button>
            ) : (
              <div
                className={`flex items-center gap-2 rounded-full border border-white/[0.08] py-2 pl-2 pr-2.5 shadow-2xl backdrop-blur-2xl ${
                  finished
                    ? 'bg-accent-green/30'
                    : paused
                      ? 'bg-accent-warning/15'
                      : 'bg-bg-elevated/95'
                }`}
                style={{
                  boxSizing: 'border-box',
                  WebkitBackdropFilter: 'blur(24px) saturate(150%)',
                  boxShadow: finished
                    ? '0 14px 40px -10px rgba(52,199,89,0.55)'
                    : '0 14px 40px -12px rgba(0,0,0,0.6)',
                }}
              >
                {Ring}

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
                  className={`flex h-9 shrink-0 items-center gap-0.5 rounded-full bg-white/[0.06] px-2 text-[12px] font-semibold tabular-nums active:scale-95 transition-transform ${
                    finished ? 'text-white' : 'text-text-primary'
                  }`}
                >
                  <Plus size={12} strokeWidth={2.8} />
                  15
                </button>

                {/* Pause / resume */}
                <button
                  type="button"
                  onClick={() => {
                    tapSoft();
                    togglePause();
                  }}
                  disabled={finished}
                  aria-label={paused ? 'Продолжить отдых' : 'Поставить на паузу'}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:scale-95 transition-all disabled:opacity-30 disabled:active:scale-100 ${
                    paused
                      ? 'bg-accent-warning/25 text-accent-warning'
                      : finished
                        ? 'bg-white/10 text-white'
                        : 'bg-white/[0.06] text-text-primary'
                  }`}
                >
                  {paused ? (
                    <Play size={15} strokeWidth={2.6} fill="currentColor" />
                  ) : (
                    <Pause size={15} strokeWidth={2.6} fill="currentColor" />
                  )}
                </button>

                {/* Minimize to puck */}
                <button
                  type="button"
                  onClick={() => {
                    tapSoft();
                    setMin(true);
                  }}
                  aria-label="Свернуть таймер"
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] active:scale-95 transition-all ${
                    finished ? 'text-white' : 'text-text-secondary'
                  }`}
                >
                  <ChevronDown size={16} strokeWidth={2.6} />
                </button>

                {/* End rest */}
                <button
                  type="button"
                  onClick={() => {
                    tapSoft();
                    endRest();
                  }}
                  aria-label="Завершить отдых"
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:scale-95 transition-all ${
                    finished
                      ? 'bg-white/20 text-white'
                      : 'bg-white/[0.06] text-text-secondary'
                  }`}
                >
                  <X size={16} strokeWidth={2.6} />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
