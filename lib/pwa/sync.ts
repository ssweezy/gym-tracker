/**
 * Sync engine for the offline queue. Drains queued sets back through the
 * normal `logSet` server action — there is no separate sync endpoint, which
 * keeps server-side validation/RLS unchanged.
 *
 * Concurrency: drainQueue is guarded by a module-level promise so concurrent
 * callers (mount + online event firing nearly simultaneously, for example)
 * coalesce into a single in-flight drain pass.
 */

import { logSet } from '@/server/sets';
import {
  getPendingSets,
  markAttempt,
  removePendingSet,
  type PendingSet,
} from './offline-queue';

/** Max attempts before we leave an entry behind in the queue for the UI to flag. */
const MAX_ATTEMPTS = 5;

/** True while in SSR (`navigator` undefined) — treat as online so server code never queues. */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  // `navigator.onLine === false` is reliable for "definitely offline".
  // `true` can be a false positive (captive portals), but for our purposes
  // a failed fetch will trip the network-error branch in log-set.ts anyway.
  return navigator.onLine !== false;
}

export interface DrainResult {
  flushed: number;
  failed: number;
  /** Entries we skipped this pass because they're over MAX_ATTEMPTS. */
  skipped: number;
}

let inFlight: Promise<DrainResult> | null = null;

export async function drainQueue(): Promise<DrainResult> {
  if (inFlight) return inFlight;
  inFlight = doDrain().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/**
 * Returns true while a drain pass is currently running. Used by the React
 * provider to expose a `syncing` flag without subscribing to internal state.
 */
export function isSyncing(): boolean {
  return inFlight !== null;
}

async function doDrain(): Promise<DrainResult> {
  const pending: PendingSet[] = await getPendingSets();
  let flushed = 0;
  let failed = 0;
  let skipped = 0;

  for (const entry of pending) {
    if (entry.attempts >= MAX_ATTEMPTS) {
      skipped += 1;
      continue;
    }
    try {
      const res = await logSet(entry.payload);
      if (res.error) {
        await markAttempt(entry.localId, res.error);
        failed += 1;
        continue;
      }
      await removePendingSet(entry.localId);
      flushed += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await markAttempt(entry.localId, msg);
      failed += 1;
    }
  }

  return { flushed, failed, skipped };
}
