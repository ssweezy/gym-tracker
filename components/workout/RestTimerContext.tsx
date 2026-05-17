'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface RestTimerState {
  endsAt: number | null;
  duration: number;
  /** Timestamp when paused (null = running). */
  pausedAt: number | null;
}

interface RestTimerContextValue extends RestTimerState {
  /** Time remaining in seconds (live, ticks every 250ms while running). */
  remaining: number;
  /** True if a rest is currently in progress (running OR paused). */
  active: boolean;
  /** True if the rest is paused. */
  paused: boolean;
  /** Start a rest. Replaces any in-progress rest. */
  startRest: (seconds: number) => void;
  /** Add N seconds to the current rest. */
  addTime: (seconds: number) => void;
  /** Toggle pause/resume. No-op when no rest is active. */
  togglePause: () => void;
  /** End the current rest. */
  endRest: () => void;
}

const RestTimerContext = createContext<RestTimerContextValue | null>(null);

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RestTimerState>({
    endsAt: null,
    duration: 0,
    pausedAt: null,
  });
  // Tick counter — used only to force re-renders. The actual "now" is
  // recomputed via Date.now() at render time so it is never stale, which
  // avoids the +1s jump on resume from `pausedAt` → `null`.
  const [, setTick] = useState(0);
  const finishedRef = useRef(false);

  // Tick only while active AND not paused.
  useEffect(() => {
    if (state.endsAt === null || state.pausedAt !== null) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [state.endsAt, state.pausedAt]);

  // When paused we freeze the "now" reference at the pause timestamp so
  // `remaining` doesn't drift while paused. While running, use Date.now()
  // directly so we never read a stale value just after resume.
  const referenceNow = state.pausedAt ?? Date.now();
  const remainingMs =
    state.endsAt !== null ? Math.max(0, state.endsAt - referenceNow) : 0;
  const remaining = Math.ceil(remainingMs / 1000);
  const active = state.endsAt !== null;
  const paused = state.pausedAt !== null;

  // Fire haptic vibration + reset finished flag when a new rest starts.
  useEffect(() => {
    if (active) finishedRef.current = false;
  }, [state.endsAt, active]);

  // Vibrate when the timer hits zero exactly once per rest. Skip while paused.
  useEffect(() => {
    if (!active || paused || finishedRef.current) return;
    if (remainingMs === 0) {
      finishedRef.current = true;
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.([200, 100, 200]);
      }
    }
  }, [active, paused, remainingMs]);

  const startRest = useCallback((seconds: number) => {
    // Rest is never shorter than 3 minutes.
    const secs = Math.max(180, seconds);
    setState({
      endsAt: Date.now() + secs * 1000,
      duration: secs,
      pausedAt: null,
    });
  }, []);

  const addTime = useCallback((seconds: number) => {
    setState((prev) => {
      if (prev.endsAt === null) return prev;
      return {
        ...prev,
        endsAt: prev.endsAt + seconds * 1000,
        duration: prev.duration + seconds,
      };
    });
  }, []);

  const togglePause = useCallback(() => {
    setState((prev) => {
      if (prev.endsAt === null) return prev;
      if (prev.pausedAt !== null) {
        // Resuming — shift endsAt forward by the duration we were paused for.
        const pauseLength = Date.now() - prev.pausedAt;
        return {
          ...prev,
          endsAt: prev.endsAt + pauseLength,
          pausedAt: null,
        };
      }
      // Pausing — record the timestamp; tick interval will stop on next render.
      return { ...prev, pausedAt: Date.now() };
    });
  }, []);

  const endRest = useCallback(() => {
    setState({ endsAt: null, duration: 0, pausedAt: null });
  }, []);

  return (
    <RestTimerContext.Provider
      value={{
        endsAt: state.endsAt,
        duration: state.duration,
        pausedAt: state.pausedAt,
        remaining,
        active,
        paused,
        startRest,
        addTime,
        togglePause,
        endRest,
      }}
    >
      {children}
    </RestTimerContext.Provider>
  );
}

export function useRestTimer(): RestTimerContextValue {
  const ctx = useContext(RestTimerContext);
  if (!ctx) {
    throw new Error('useRestTimer must be used inside <RestTimerProvider>');
  }
  return ctx;
}
