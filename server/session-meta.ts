'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/supabase';
import type { SessionMeta } from './types';

/**
 * Read-modify-write the `sessions.meta` jsonb. Single-user sessions with
 * low write concurrency, so a read-then-write race is acceptable here;
 * the toggles are idempotent which keeps it safe in practice.
 */
async function mutateMeta(
  sessionId: string,
  mutate: (meta: SessionMeta) => SessionMeta,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  const { data: row, error: readErr } = await supabase
    .from('sessions')
    .select('meta')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (readErr) return { error: readErr.message };
  if (!row) return { error: 'Сессия не найдена' };

  const current = ((row as { meta?: SessionMeta }).meta ?? {}) as SessionMeta;
  const next = mutate({
    skipped: current.skipped ?? [],
    setOverrides: current.setOverrides ?? {},
  });

  const { error: writeErr } = await supabase
    .from('sessions')
    .update({ meta: next as unknown as Json })
    .eq('id', sessionId)
    .eq('user_id', user.id);
  if (writeErr) return { error: writeErr.message };

  revalidatePath('/');
  return {};
}

/** Mark / unmark a plan exercise as "не выполнено" for this session. */
export async function setSkippedExercise(
  sessionId: string,
  planExerciseId: string,
  skipped: boolean,
): Promise<{ error?: string }> {
  return mutateMeta(sessionId, (meta) => {
    const set = new Set(meta.skipped ?? []);
    if (skipped) set.add(planExerciseId);
    else set.delete(planExerciseId);
    return { ...meta, skipped: Array.from(set) };
  });
}

/**
 * Override the target set count for one exercise in this session only
 * (does not mutate the plan). Pass `null` to clear the override and fall
 * back to the plan's `target_sets`.
 */
export async function setExerciseSetsOverride(
  sessionId: string,
  planExerciseId: string,
  sets: number | null,
): Promise<{ error?: string }> {
  return mutateMeta(sessionId, (meta) => {
    const overrides = { ...(meta.setOverrides ?? {}) };
    if (sets === null) {
      delete overrides[planExerciseId];
    } else {
      overrides[planExerciseId] = Math.max(1, Math.min(20, Math.round(sets)));
    }
    return { ...meta, setOverrides: overrides };
  });
}
