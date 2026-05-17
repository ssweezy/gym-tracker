'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { ensureActiveSeason } from './seasons';
import type { WorkoutDetail, WorkoutHistoryItem } from './types';

/**
 * Finished sessions with per-session aggregates, newest first. Scoped to a
 * season — defaults to the active one (so a new season resets the list).
 */
export async function listWorkoutHistory(
  limit = 50,
  seasonId?: string,
): Promise<WorkoutHistoryItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let sid = seasonId;
  if (!sid) {
    const active = await ensureActiveSeason();
    if (!active) return [];
    sid = active.id;
  }

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('id, started_at, finished_at, plan_days(title)')
    .eq('user_id', user.id)
    .eq('season_id', sid)
    .not('finished_at', 'is', null)
    .order('finished_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  if (!sessions || sessions.length === 0) return [];

  const ids = sessions.map((s) => s.id);
  const { data: sets } = await supabase
    .from('sets')
    .select('session_id, weight_kg, reps, exercises(name)')
    .in('session_id', ids);

  const agg = new Map<
    string,
    { count: number; tonnage: number; names: Set<string> }
  >();
  for (const r of sets ?? []) {
    const row = r as unknown as {
      session_id: string;
      weight_kg: number;
      reps: number;
      exercises: { name: string } | null;
    };
    const a = agg.get(row.session_id) ?? {
      count: 0,
      tonnage: 0,
      names: new Set<string>(),
    };
    a.count += 1;
    a.tonnage += row.weight_kg * row.reps;
    if (row.exercises?.name) a.names.add(row.exercises.name);
    agg.set(row.session_id, a);
  }

  return sessions
    .filter((s) => s.started_at && s.finished_at)
    .map((s) => {
      const a = agg.get(s.id);
      const planDay = s.plan_days as { title: string | null } | null;
      const ms =
        new Date(s.finished_at as string).getTime() -
        new Date(s.started_at).getTime();
      return {
        id: s.id,
        started_at: s.started_at,
        finished_at: s.finished_at as string,
        duration_min: Math.max(0, Math.round(ms / 60000)),
        title: planDay?.title?.trim() || 'Тренировка',
        set_count: a?.count ?? 0,
        tonnage_kg: a?.tonnage ?? 0,
        exercises: a ? Array.from(a.names) : [],
      };
    });
}

/** Full breakdown of one workout — every set grouped by exercise. */
export async function getWorkoutDetail(
  sessionId: string,
): Promise<WorkoutDetail | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: session } = await supabase
    .from('sessions')
    .select('id, started_at, finished_at, user_id, plan_days(title)')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!session) return null;

  const { data: sets } = await supabase
    .from('sets')
    .select('weight_kg, reps, is_first_set, set_order, exercise_id, exercises(name)')
    .eq('session_id', sessionId)
    .order('set_order', { ascending: true });

  const order: string[] = [];
  const byEx = new Map<
    string,
    { name: string; sets: { weight_kg: number; reps: number; is_first_set: boolean }[] }
  >();
  let setCount = 0;
  let tonnage = 0;
  for (const r of sets ?? []) {
    const row = r as unknown as {
      weight_kg: number;
      reps: number;
      is_first_set: boolean;
      exercise_id: string;
      exercises: { name: string } | null;
    };
    setCount += 1;
    tonnage += row.weight_kg * row.reps;
    if (!byEx.has(row.exercise_id)) {
      order.push(row.exercise_id);
      byEx.set(row.exercise_id, {
        name: row.exercises?.name ?? 'Упражнение',
        sets: [],
      });
    }
    byEx.get(row.exercise_id)!.sets.push({
      weight_kg: row.weight_kg,
      reps: row.reps,
      is_first_set: row.is_first_set,
    });
  }

  const planDay = session.plan_days as { title: string | null } | null;
  const ms = session.finished_at
    ? new Date(session.finished_at).getTime() -
      new Date(session.started_at).getTime()
    : 0;

  return {
    id: session.id,
    title: planDay?.title?.trim() || 'Тренировка',
    started_at: session.started_at,
    finished_at: session.finished_at,
    duration_min: Math.max(0, Math.round(ms / 60000)),
    set_count: setCount,
    tonnage_kg: tonnage,
    exercises: order.map((id) => ({
      exercise_id: id,
      name: byEx.get(id)!.name,
      sets: byEx.get(id)!.sets,
    })),
  };
}

/** Delete one workout (its sets cascade via FK). */
export async function deleteWorkout(
  sessionId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/progress');
  revalidatePath('/profile');
  revalidatePath('/');
  return {};
}
