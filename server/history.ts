'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { WorkoutHistoryItem } from './types';

/**
 * Finished sessions with per-session aggregates (sets, tonnage, exercises),
 * newest first. Used by the Progress history list and the Profile card.
 */
export async function listWorkoutHistory(
  limit = 50,
): Promise<WorkoutHistoryItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('id, started_at, finished_at, plan_days(title)')
    .eq('user_id', user.id)
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

/**
 * Wipe ALL of the user's workouts — a fresh "season". Deletes every session
 * (finished or in-progress); sets cascade. Plans/exercises are untouched.
 */
export async function resetAllWorkouts(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('user_id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/progress');
  revalidatePath('/profile');
  revalidatePath('/');
  return {};
}
