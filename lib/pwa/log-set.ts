/**
 * Offline-aware wrapper around the `logSet` server action.
 *
 * Decision tree:
 *   1. If `navigator.onLine === false`: enqueue immediately and return
 *      `{ ok: true, queued: true }`. Don't even attempt the network call —
 *      it would just fail and waste time.
 *   2. Otherwise: call `logSet`. On success, return `{ ok: true }`. On a
 *      network-shaped error (TypeError thrown, or a `{ error }` result whose
 *      message looks like a fetch / 5xx failure), fall through to enqueue
 *      and return `{ ok: true, queued: true }`. Other errors (validation,
 *      auth, RLS denial) are surfaced unchanged so the UI can react.
 *
 * TODO(dedupe): If the same set is enqueued twice (rare: a user double-taps
 * "Записать подход" while the network is flaky, the first attempt times out
 * AFTER the server has already inserted, and the retry then re-inserts on
 * drain) we will end up with two rows. The server has no idempotency key
 * for sets right now. For MVP we accept this — the user can delete the
 * dupe from the session view. A proper fix would attach a client-generated
 * `request_id` UUID to the payload and add a unique index server-side.
 */

import { logSet } from '@/server/sets';
import type { LogSetInput } from '@/server/types';
import { enqueueSet } from './offline-queue';
import type { OfflineQueueContextValue } from '@/components/pwa/OfflineQueueProvider';

export interface LogSetWithOfflineResult {
  ok: true;
  /** True when the set is sitting in the IDB queue instead of being persisted. */
  queued?: boolean;
  /** Populated when the server returned a non-network error and we surfaced it. */
  error?: string;
}

interface LogSetCtx {
  enqueue: OfflineQueueContextValue['enqueue'];
}

/** Lower-cased substrings that mark an error as "network-ish" and worth queuing. */
const NETWORK_ERROR_HINTS = [
  'failed to fetch',
  'networkerror',
  'network error',
  'load failed',
  'fetch failed',
  'connection',
  'offline',
  'timeout',
  'timed out',
  'unavailable',
  'gateway',
  'econnreset',
  'enotfound',
];

function looksLikeNetworkError(message: string): boolean {
  const lower = message.toLowerCase();
  if (NETWORK_ERROR_HINTS.some((hint) => lower.includes(hint))) return true;
  // Server actions return string errors; we also treat explicit 5xx markers as network-ish.
  if (/\b5\d\d\b/.test(lower)) return true;
  return false;
}

export async function logSetWithOffline(
  payload: LogSetInput,
  ctx: LogSetCtx,
): Promise<LogSetWithOfflineResult> {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (offline) {
    await ctx.enqueue(payload);
    return { ok: true, queued: true };
  }

  try {
    const res = await logSet(payload);
    if (!res.error) {
      return { ok: true };
    }
    // Server-action returned a typed error string. Queue only if it smells network-y.
    if (looksLikeNetworkError(res.error)) {
      await ctx.enqueue(payload);
      return { ok: true, queued: true };
    }
    return { ok: true, error: res.error };
  } catch (err) {
    // A thrown error from a server action almost always means transport-level
    // failure (next/server-action returns rather than throws on app errors).
    // TypeError in particular is the canonical "fetch failed" shape.
    const message = err instanceof Error ? err.message : String(err);
    if (err instanceof TypeError || looksLikeNetworkError(message)) {
      await ctx.enqueue(payload);
      return { ok: true, queued: true };
    }
    return { ok: true, error: message };
  }
}

/** Re-export for callers that don't want a second import. */
export type { LogSetInput };
