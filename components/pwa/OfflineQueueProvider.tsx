'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  enqueueSet,
  getPendingSets,
  type PendingSet,
} from '@/lib/pwa/offline-queue';
import { drainQueue, isOnline } from '@/lib/pwa/sync';
import type { LogSetInput } from '@/server/types';

export interface OfflineQueueContextValue {
  /** `navigator.onLine` — refreshed via the `online`/`offline` events. */
  online: boolean;
  /** All pending sets across all sessions, ordered by queuedAt asc. */
  pending: PendingSet[];
  /** Convenience selector for per-session UI (e.g., session control bar). */
  pendingForSession: (sessionId: string) => PendingSet[];
  /** Fire-and-forget enqueue. Resolves once IDB has accepted the entry. */
  enqueue: (payload: LogSetInput) => Promise<void>;
  /** True while a drainQueue() pass is in flight. */
  syncing: boolean;
  /** Manual trigger; usually unnecessary because mount + online events drain automatically. */
  drain: () => Promise<void>;
  /** True briefly after a drain pass that flushed at least one set. UI shows "Готово". */
  justFlushed: boolean;
}

const OfflineQueueContext = createContext<OfflineQueueContextValue | null>(null);

/**
 * Mount once inside `(app)/layout.tsx`. Tracks `navigator.onLine`, mirrors
 * the IDB queue into React state, and auto-drains on:
 *   1. Mount (in case we crashed mid-drain on a previous session).
 *   2. The `online` window event firing.
 *   3. Immediately after `enqueue()` when we believe we're online — covers
 *      the case where the server briefly returned a 5xx and we queued
 *      defensively but connectivity itself is fine.
 */
export function OfflineQueueProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState<boolean>(() => isOnline());
  const [pending, setPending] = useState<PendingSet[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [justFlushed, setJustFlushed] = useState(false);
  const justFlushedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshPending = useCallback(async () => {
    const rows = await getPendingSets();
    setPending(rows);
  }, []);

  const drain = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    setSyncing(true);
    try {
      const result = await drainQueue();
      await refreshPending();
      if (result.flushed > 0) {
        setJustFlushed(true);
        if (justFlushedTimerRef.current) clearTimeout(justFlushedTimerRef.current);
        justFlushedTimerRef.current = setTimeout(() => setJustFlushed(false), 1800);
      }
    } finally {
      setSyncing(false);
    }
  }, [refreshPending]);

  // Initial load + auto-drain on mount when online.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await getPendingSets();
      if (cancelled) return;
      setPending(rows);
      if (rows.length > 0 && isOnline()) {
        await drain();
      }
    })();
    return () => {
      cancelled = true;
    };
    // `drain` is stable (useCallback), and we intentionally only want this on mount.
  }, [drain]);

  // Online/offline event subscription. The `online` handler also triggers a
  // drain pass — that's the main reason this provider exists.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOnline = () => {
      setOnline(true);
      void drain();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [drain]);

  const enqueue = useCallback(
    async (payload: LogSetInput) => {
      const stored = await enqueueSet(payload);
      if (stored) {
        setPending((prev) => [...prev, stored]);
      }
      // If we think we're online, kick off an immediate drain — covers the
      // "queued defensively because of a 5xx but the network is actually fine"
      // case. Fire-and-forget; the UI already showed the queued toast.
      if (isOnline()) {
        void drain();
      }
    },
    [drain],
  );

  const pendingForSession = useCallback(
    (sessionId: string) =>
      pending.filter((p) => p.payload.session_id === sessionId),
    [pending],
  );

  useEffect(() => {
    return () => {
      if (justFlushedTimerRef.current) clearTimeout(justFlushedTimerRef.current);
    };
  }, []);

  const value = useMemo<OfflineQueueContextValue>(
    () => ({
      online,
      pending,
      pendingForSession,
      enqueue,
      syncing,
      drain,
      justFlushed,
    }),
    [online, pending, pendingForSession, enqueue, syncing, drain, justFlushed],
  );

  return (
    <OfflineQueueContext.Provider value={value}>
      {children}
    </OfflineQueueContext.Provider>
  );
}

export function useOfflineQueue(): OfflineQueueContextValue {
  const ctx = useContext(OfflineQueueContext);
  if (!ctx) {
    throw new Error(
      'useOfflineQueue must be used inside <OfflineQueueProvider>',
    );
  }
  return ctx;
}
