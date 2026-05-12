'use client';

import { useEffect, useState } from 'react';

interface SessionTimerProps {
  startedAt: string;
}

function format(elapsedSec: number): string {
  const s = Math.max(0, Math.floor(elapsedSec));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hh > 0) return `${hh}:${pad(mm)}:${pad(ss)}`;
  return `${pad(mm)}:${pad(ss)}`;
}

/**
 * Live elapsed-time pill for an active workout.
 * Ticks every second on the client; the `startedAt` ISO timestamp is the
 * anchor, so the display stays correct across re-renders and tab switches.
 */
export function SessionTimer({ startedAt }: SessionTimerProps) {
  const startMs = new Date(startedAt).getTime();
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsedSec = (now - startMs) / 1000;
  const label = format(elapsedSec);

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-accent-crimson/12 px-2.5 py-1 text-[11px] font-semibold text-accent-crimson tabular-nums"
      style={{ fontFeatureSettings: '"tnum"' }}
      aria-label="Время тренировки"
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-crimson opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-crimson" />
      </span>
      <span>{label}</span>
      <span className="text-[10px] uppercase tracking-[0.08em] opacity-80">
        идёт
      </span>
    </span>
  );
}
