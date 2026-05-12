/**
 * Offline queue for set logging — backed by IndexedDB.
 *
 * SCOPE — what is and isn't offline-capable:
 *   - YES: Logging an individual set (`logSet`) is the ONLY mutation that
 *     gets queued. A session must already exist on the server before any of
 *     its sets can be queued.
 *   - NO:  Session-start, session-finish, plan editing, exercise creation,
 *     onboarding, and every other mutation require online connectivity. The
 *     UI gates these actions explicitly.
 *
 * Consequence: if the user starts a session online, then loses connectivity
 * mid-workout, they can keep logging sets — those get queued and flushed
 * when the network returns. They CANNOT finish the session until back
 * online (the finish button hits the server directly).
 *
 * Implementation: hand-rolled wrapper over the native IndexedDB API. The
 * native API is event-based; we wrap each request in a Promise via the
 * `promisify` helper.
 *
 * Schema:
 *   DB:    gym-tracker-offline  (version 1)
 *   Store: pending_sets         keyPath = 'localId', autoIncrement
 *     Indexes:
 *       by_session   — payload.session_id (fast per-session lookup)
 *       by_queuedAt  — queuedAt           (drain in insertion order)
 *
 * Quota-exceeded errors return `null` from `enqueueSet` and log a warning
 * rather than throwing — the caller decides how to surface that to the user.
 */

import type { LogSetInput } from '@/server/types';

export interface PendingSet {
  /** Auto-increment primary key assigned by IDB on put(). */
  localId: number;
  /** Exact payload that will be replayed against `logSet`. */
  payload: LogSetInput;
  /** Date.now() at the moment of enqueue. Used for ordered drain. */
  queuedAt: number;
  /** Incremented each time we attempt to flush this entry. */
  attempts: number;
  /** Last error message from a failed flush, if any. */
  lastError?: string;
}

const DB_NAME = 'gym-tracker-offline';
const DB_VERSION = 1;
const STORE = 'pending_sets';

type StoredPendingSet = Omit<PendingSet, 'localId'> & { localId?: number };

/** Single in-flight DB open promise — reused across calls in the same tab. */
let dbPromise: Promise<IDBDatabase> | null = null;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

/** Wrap an IDBRequest in a Promise. */
function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

/** Wrap a transaction completion in a Promise. */
function txnDone(txn: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    txn.oncomplete = () => resolve();
    txn.onerror = () => reject(txn.error ?? new Error('IndexedDB transaction failed'));
    txn.onabort = () => reject(txn.error ?? new Error('IndexedDB transaction aborted'));
  });
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!isBrowser()) {
      reject(new Error('IndexedDB is unavailable (SSR or unsupported browser)'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, {
          keyPath: 'localId',
          autoIncrement: true,
        });
        // Index for per-session queries (fast lookup of pending sets by session).
        store.createIndex('by_session', 'payload.session_id', { unique: false });
        // Index for ordered drain (oldest first).
        store.createIndex('by_queuedAt', 'queuedAt', { unique: false });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      // If the schema upgrade closes the connection later, drop the cache so
      // the next call re-opens cleanly.
      db.onclose = () => {
        if (dbPromise) dbPromise = null;
      };
      db.onversionchange = () => {
        db.close();
        if (dbPromise) dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error('Failed to open IndexedDB'));
    };
    req.onblocked = () => {
      // Another tab holds an older version open. Surface as an error; the
      // user can refresh once they're done with the other tab.
      dbPromise = null;
      reject(new Error('IndexedDB upgrade blocked by another tab'));
    };
  });
  return dbPromise;
}

function isQuotaError(err: unknown): boolean {
  if (err instanceof DOMException) {
    return (
      err.name === 'QuotaExceededError' ||
      // Firefox legacy name
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.code === 22
    );
  }
  return false;
}

/**
 * Enqueue a pending set. Returns the stored record with its assigned
 * `localId`, or `null` if the device is out of storage quota.
 */
export async function enqueueSet(payload: LogSetInput): Promise<PendingSet | null> {
  if (!isBrowser()) return null;
  try {
    const db = await openDb();
    const txn = db.transaction(STORE, 'readwrite');
    const store = txn.objectStore(STORE);
    const record: StoredPendingSet = {
      payload,
      queuedAt: Date.now(),
      attempts: 0,
    };
    const key = await promisify(store.add(record));
    await txnDone(txn);
    const localId = typeof key === 'number' ? key : Number(key);
    return { ...record, localId } as PendingSet;
  } catch (err) {
    if (isQuotaError(err)) {
      // eslint-disable-next-line no-console
      console.warn('[offline-queue] IDB quota exceeded; set not queued', err);
      return null;
    }
    // eslint-disable-next-line no-console
    console.warn('[offline-queue] enqueue failed', err);
    return null;
  }
}

/** All pending sets across all sessions, ordered by `queuedAt` ascending. */
export async function getPendingSets(): Promise<PendingSet[]> {
  if (!isBrowser()) return [];
  try {
    const db = await openDb();
    const txn = db.transaction(STORE, 'readonly');
    const index = txn.objectStore(STORE).index('by_queuedAt');
    const all = await promisify(index.getAll());
    await txnDone(txn);
    return all as PendingSet[];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[offline-queue] getPendingSets failed', err);
    return [];
  }
}

/** Pending sets scoped to a single session, ordered by `queuedAt` ascending. */
export async function getPendingForSession(sessionId: string): Promise<PendingSet[]> {
  if (!isBrowser()) return [];
  try {
    const db = await openDb();
    const txn = db.transaction(STORE, 'readonly');
    const index = txn.objectStore(STORE).index('by_session');
    const rows = (await promisify(index.getAll(IDBKeyRange.only(sessionId)))) as PendingSet[];
    await txnDone(txn);
    return rows.sort((a, b) => a.queuedAt - b.queuedAt);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[offline-queue] getPendingForSession failed', err);
    return [];
  }
}

export async function removePendingSet(localId: number): Promise<void> {
  if (!isBrowser()) return;
  try {
    const db = await openDb();
    const txn = db.transaction(STORE, 'readwrite');
    await promisify(txn.objectStore(STORE).delete(localId));
    await txnDone(txn);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[offline-queue] removePendingSet failed', err);
  }
}

/** Increment `attempts` and (optionally) record the last error message. */
export async function markAttempt(localId: number, error?: string): Promise<void> {
  if (!isBrowser()) return;
  try {
    const db = await openDb();
    const txn = db.transaction(STORE, 'readwrite');
    const store = txn.objectStore(STORE);
    const existing = (await promisify(store.get(localId))) as PendingSet | undefined;
    if (!existing) {
      await txnDone(txn);
      return;
    }
    const next: PendingSet = {
      ...existing,
      attempts: existing.attempts + 1,
      lastError: error,
    };
    await promisify(store.put(next));
    await txnDone(txn);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[offline-queue] markAttempt failed', err);
  }
}

export async function clearAll(): Promise<void> {
  if (!isBrowser()) return;
  try {
    const db = await openDb();
    const txn = db.transaction(STORE, 'readwrite');
    await promisify(txn.objectStore(STORE).clear());
    await txnDone(txn);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[offline-queue] clearAll failed', err);
  }
}
