'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { toSchemaWeekday } from '@/lib/date';
import { ensureActiveSeason } from './seasons';
import type { RepCategory } from '@/lib/progression';
import type { SessionRow } from './types';

export interface AdHocExercise {
  exercise_id: string;
  rep_category: RepCategory;
  /** 1..10 */
  target_sets: number;
}

export async function getActiveSessionForToday(
  planDayId: string,
): Promise<SessionRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // start-of-day in UTC; close enough for the in-progress check
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('plan_day_id', planDayId)
    .is('finished_at', null)
    .gte('started_at', start.toISOString())
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getActiveExtraSessionForToday(): Promise<SessionRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', user.id)
    .is('plan_day_id', null)
    .is('finished_at', null)
    .gte('started_at', start.toISOString())
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function startSession(
  planDayId?: string | null,
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  // reuse in-progress today's session if exists
  if (planDayId) {
    const existing = await getActiveSessionForToday(planDayId);
    if (existing) return { id: existing.id };
  } else {
    const existing = await getActiveExtraSessionForToday();
    if (existing) return { id: existing.id };
  }

  const season = await ensureActiveSeason();

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: user.id,
      plan_day_id: planDayId ?? null,
      season_id: season?.id ?? null,
    })
    .select('id')
    .single();
  if (error || !data) return { error: error?.message ?? 'Не удалось начать тренировку' };

  revalidatePath('/');
  return { id: data.id };
}

export async function startExtraSession(): Promise<{ id?: string; error?: string }> {
  return startSession(null);
}

/**
 * Latest in-progress session for the current user, regardless of plan_day.
 * Returns the most recent session started today that has not been finished.
 * Used by the Today screen to surface BOTH planned and ad-hoc workouts under
 * a single render path.
 */
export async function getCurrentSession(): Promise<SessionRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', user.id)
    .is('finished_at', null)
    .gte('started_at', start.toISOString())
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Build an ad-hoc workout: pick exercises up front, get a real plan_day to
 * back the session so the standard PlanExerciseFlow renders it. The hidden
 * plan (`name='__extra__'`, `is_active=false`) is created lazily once per
 * user and reused for every subsequent ad-hoc workout.
 */
export async function createAdHocSession(
  picks: AdHocExercise[],
): Promise<{ id?: string; error?: string }> {
  if (picks.length === 0) return { error: 'Выберите хотя бы одно упражнение' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  // 1) Find or create hidden plan.
  const { data: existingPlan, error: planLookupError } = await supabase
    .from('plans')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', '__extra__')
    .limit(1)
    .maybeSingle();
  if (planLookupError) return { error: planLookupError.message };

  let hiddenPlanId = existingPlan?.id;
  if (!hiddenPlanId) {
    const { data: newPlan, error: planInsertError } = await supabase
      .from('plans')
      .insert({
        user_id: user.id,
        name: '__extra__',
        is_active: false,
      })
      .select('id')
      .single();
    if (planInsertError || !newPlan) {
      return { error: planInsertError?.message ?? 'Не удалось создать скрытый план' };
    }
    hiddenPlanId = newPlan.id;
  }

  // 2) Compute today's weekday + display date.
  const today = new Date();
  const weekday = toSchemaWeekday(today);
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const title = `Внеплановая · ${dd}.${mm}`;

  // 3) Insert plan_day.
  const { data: planDay, error: dayError } = await supabase
    .from('plan_days')
    .insert({
      plan_id: hiddenPlanId,
      weekday,
      is_rest: false,
      title,
      // Minutes since midnight — keeps daily insertion order stable and fits in smallint.
      order_idx: today.getHours() * 60 + today.getMinutes(),
    })
    .select('id')
    .single();
  if (dayError || !planDay) {
    return { error: dayError?.message ?? 'Не удалось создать день' };
  }

  // 4) Insert plan_exercises in batch.
  const rows = picks.map((p, i) => ({
    plan_day_id: planDay.id,
    exercise_id: p.exercise_id,
    rep_category: p.rep_category,
    target_sets: p.target_sets,
    order_idx: i,
  }));
  const { error: peError } = await supabase.from('plan_exercises').insert(rows);
  if (peError) return { error: peError.message };

  // 5) Insert session.
  const season = await ensureActiveSeason();

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      user_id: user.id,
      plan_day_id: planDay.id,
      season_id: season?.id ?? null,
    })
    .select('id')
    .single();
  if (sessionError || !session) {
    return { error: sessionError?.message ?? 'Не удалось начать тренировку' };
  }

  revalidatePath('/');
  return { id: session.id };
}

export async function getFinishedSessions(
  sinceDays = 90,
): Promise<SessionRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const since = new Date();
  since.setDate(since.getDate() - sinceDays);

  // Stats are scoped to the active season — past seasons are archived.
  const season = await ensureActiveSeason();
  if (!season) return [];

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('season_id', season.id)
    .not('finished_at', 'is', null)
    .gte('finished_at', since.toISOString())
    .order('finished_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface SessionWithDuration {
  id: string;
  plan_day_id: string | null;
  started_at: string;
  finished_at: string;
  notes: string | null;
  duration_min: number;
}

/**
 * Finished sessions in the given window, each enriched with `duration_min`
 * computed from `started_at`/`finished_at`. Rows missing either timestamp
 * are dropped (defensive — `finished_at` is set by `finishSession`).
 */
export async function getFinishedSessionsWithDuration(
  sinceDays = 90,
): Promise<SessionWithDuration[]> {
  const rows = await getFinishedSessions(sinceDays);
  return rows
    .filter(
      (r): r is SessionRow & { started_at: string; finished_at: string } =>
        Boolean(r.started_at) && Boolean(r.finished_at),
    )
    .map((r) => {
      const ms =
        new Date(r.finished_at).getTime() - new Date(r.started_at).getTime();
      const duration_min = Math.max(0, Math.round(ms / 60000));
      return {
        id: r.id,
        plan_day_id: r.plan_day_id,
        started_at: r.started_at,
        finished_at: r.finished_at,
        notes: r.notes,
        duration_min,
      };
    });
}

export async function finishSession(
  sessionId: string,
  notes?: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  const { error } = await supabase
    .from('sessions')
    .update({
      finished_at: new Date().toISOString(),
      notes: notes?.trim() || null,
    })
    .eq('id', sessionId);
  if (error) return { error: error.message };

  revalidatePath('/');
  revalidatePath('/progress');
  return {};
}
