'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CloudOff, Loader2, Check } from 'lucide-react';
import { useOfflineQueue } from './OfflineQueueProvider';

/**
 * Sticky pill at the top of `(app)` screens that surfaces offline-queue
 * state. Four visible states (one is "Готово" briefly after a drain
 * flushes ≥1 set):
 *
 *   1. Offline + queue empty       → "Нет связи"
 *   2. Offline + N pending         → "Нет связи · N в очереди"
 *   3. Online + syncing N items    → "Синхронизация · N"
 *   4. Online + just flushed       → "Готово" (briefly, then hides)
 *
 * Hidden when online and the queue is empty.
 */
function pluralPodhod(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'подход';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'подхода';
  return 'подходов';
}

export function OfflineBadge() {
  const { online, pending, syncing, justFlushed } = useOfflineQueue();
  const count = pending.length;

  // Decide visibility + variant ------------------------------------------
  let variant: 'offline' | 'syncing' | 'done' | null = null;
  if (!online) variant = 'offline';
  else if (syncing && count > 0) variant = 'syncing';
  else if (justFlushed) variant = 'done';

  const palette: Record<
    'offline' | 'syncing' | 'done',
    { bg: string; border: string; text: string; shadow: string }
  > = {
    offline: {
      bg: 'rgba(255,45,85,0.18)',
      border: 'rgba(255,45,85,0.35)',
      text: '#FF6B89',
      shadow: '0 8px 22px -10px rgba(255,45,85,0.55)',
    },
    syncing: {
      bg: 'rgba(255,149,0,0.18)',
      border: 'rgba(255,149,0,0.35)',
      text: '#FFB45A',
      shadow: '0 8px 22px -10px rgba(255,149,0,0.5)',
    },
    done: {
      bg: 'rgba(52,199,89,0.20)',
      border: 'rgba(52,199,89,0.40)',
      text: '#5EE38C',
      shadow: '0 8px 22px -10px rgba(52,199,89,0.55)',
    },
  };

  let label: string | null = null;
  if (variant === 'offline') {
    label =
      count > 0
        ? `Нет связи · ${count} ${pluralPodhod(count)} в очереди`
        : 'Нет связи';
  } else if (variant === 'syncing') {
    label = `Синхронизация · ${count}`;
  } else if (variant === 'done') {
    label = 'Готово';
  }

  const tone = variant ? palette[variant] : null;

  return (
    <AnimatePresence>
      {variant && tone && (
        <motion.div
          key={variant}
          initial={{ y: -16, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -16, opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="pointer-events-none fixed left-1/2 z-40 -translate-x-1/2"
          style={{
            top: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
          }}
        >
          <div
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] backdrop-blur-xl"
            style={{
              backgroundColor: tone.bg,
              borderColor: tone.border,
              color: tone.text,
              boxShadow: tone.shadow,
              WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            }}
            role="status"
            aria-live="polite"
          >
            {variant === 'offline' && (
              <CloudOff size={13} strokeWidth={2.6} aria-hidden="true" />
            )}
            {variant === 'syncing' && (
              <Loader2
                size={13}
                strokeWidth={2.6}
                aria-hidden="true"
                className="animate-spin"
              />
            )}
            {variant === 'done' && (
              <Check size={13} strokeWidth={2.8} aria-hidden="true" />
            )}
            <span>{label}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
