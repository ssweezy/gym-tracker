'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { SetHistoryEntry } from '@/lib/progression';
import type { SetRow, LogSetInput } from './types';

export async function logSet(
  input: LogSetInput,
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  // Determine next set_order for (session, exercise)
  const { data: last } = await supabase
    .from('sets')
    .select('set_order')
    .eq('session_id', input.session_id)
    .eq('exercise_id', input.exercise_id)
    .order('set_order', { ascending: false })
    .limit(1);

  const nextOrder = last && last.length > 0 ? last[0].set_order + 1 : 1;

  const { data, error } = await supabase
    .from('sets')
    .insert({
      session_id: input.session_id,
      exercise_id: input.exercise_id,
      weight_kg: input.weight_kg,
      reps: input.reps,
      target_reps: input.target_reps,
      is_first_set: input.is_first_set,
      reached_failure: input.reached_failure ?? null,
      rpe: input.rpe ?? null,
      set_order: nextOrder,
      completed_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error || !data) return { error: error?.message ?? 'Не удалось записать подход' };

  revalidatePath('/');
  return { id: data.id };
}

export async function getSetsForSession(sessionId: string): Promise<SetRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sets')
    .select('*')
    .eq('session_id', sessionId)
    .order('completed_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface PersonalBest {
  weight_kg: number;
  reps: number;
  completed_at: string;
}

/**
 * Returns the user's heaviest set ever logged for the given exercise.
 * Tie-break: most reps, then most recent.
 */
export async function getPersonalBest(
  exerciseId: string,
): Promise<PersonalBest | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('sets')
    .select('weight_kg, reps, completed_at, sessions!inner(user_id)')
    .eq('exercise_id', exerciseId)
    .eq('sessions.user_id', user.id)
    .not('completed_at', 'is', null)
    .order('weight_kg', { ascending: false })
    .order('reps', { ascending: false })
    .order('completed_at', { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return null;

  const row = data[0];
  if (!row.completed_at) return null;
  return {
    weight_kg: row.weight_kg,
    reps: row.reps,
    completed_at: row.completed_at,
  };
}

export async function getSetHistoryForExercise(
  exerciseId: string,
  limit = 10,
): Promise<SetHistoryEntry[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Only first sets — feed for the progression algorithm
  const { data, error } = await supabase
    .from('sets')
    .select('weight_kg, reps, target_reps, reached_failure, completed_at, sessions!inner(user_id)')
    .eq('exercise_id', exerciseId)
    .eq('is_first_set', true)
    .eq('sessions.user_id', user.id)
    .order('completed_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((s): s is typeof s & { completed_at: string } => Boolean(s.completed_at))
    .map((s) => ({
      weight_kg: s.weight_kg,
      reps: s.reps,
      target_reps: s.target_reps,
      reached_failure: s.reached_failure,
      completed_at: new Date(s.completed_at),
    }));
}

export interface FirstSetPoint {
  completed_at: string;
  weight_kg: number;
  reps: number;
}

/**
 * All first sets for an exercise across the user's history, oldest → newest.
 * Used to render the weight-over-time progress chart.
 */
export async function getFirstSetsForExercise(
  exerciseId: string,
): Promise<FirstSetPoint[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('sets')
    .select('weight_kg, reps, completed_at, sessions!inner(user_id)')
    .eq('exercise_id', exerciseId)
    .eq('is_first_set', true)
    .eq('sessions.user_id', user.id)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((s): s is typeof s & { completed_at: string } => Boolean(s.completed_at))
    .map((s) => ({
      completed_at: s.completed_at,
      weight_kg: s.weight_kg,
      reps: s.reps,
    }));
}

export interface WeeklyTonnageBucket {
  weekStart: string; // ISO date YYYY-MM-DD (Monday)
  tonnage: number; // sum of weight_kg × reps
  setCount: number;
}

/**
 * Aggregate ALL sets (not just first) by ISO week for the given exercise.
 * Returns the last 12 ISO weeks (oldest → newest), filling empty weeks with
 * zeros so the bar chart always shows a fixed-width 12-bar timeline.
 */
export async function getAllSetsForExerciseTotalsByWeek(
  exerciseId: string,
): Promise<WeeklyTonnageBucket[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Build the 12-week window starting from 11 weeks ago Monday → now
  const todayMonday = mondayOfDate(new Date());
  const startMonday = new Date(todayMonday);
  startMonday.setDate(startMonday.getDate() - 11 * 7);

  const { data, error } = await supabase
    .from('sets')
    .select('weight_kg, reps, completed_at, sessions!inner(user_id)')
    .eq('exercise_id', exerciseId)
    .eq('sessions.user_id', user.id)
    .not('completed_at', 'is', null)
    .gte('completed_at', startMonday.toISOString());
  if (error) throw new Error(error.message);

  // Initialise the 12 buckets
  const buckets: WeeklyTonnageBucket[] = [];
  for (let i = 0; i < 12; i++) {
    const m = new Date(startMonday);
    m.setDate(m.getDate() + i * 7);
    buckets.push({
      weekStart: isoDate(m),
      tonnage: 0,
      setCount: 0,
    });
  }

  for (const row of data ?? []) {
    if (!row.completed_at) continue;
    const d = new Date(row.completed_at);
    const monday = mondayOfDate(d);
    const idx = Math.floor(
      (monday.getTime() - startMonday.getTime()) / (7 * 86400000),
    );
    if (idx < 0 || idx >= 12) continue;
    buckets[idx].tonnage += row.weight_kg * row.reps;
    buckets[idx].setCount += 1;
  }

  return buckets;
}

export interface SessionForExerciseRow {
  session_id: string;
  finished_at: string | null;
  started_at: string;
  setCount: number;
  topWeight: number;
  topReps: number;
}

/**
 * Sessions in which the user performed the given exercise. Aggregated in TS
 * (one row per (session, exercise)) so no DB columns/views are required.
 * Newest first; `topReps` is the reps of the heaviest set, tie-broken by reps.
 */
export async function getSessionsForExercise(
  exerciseId: string,
): Promise<SessionForExerciseRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('sets')
    .select(
      'session_id, weight_kg, reps, completed_at, sessions!inner(user_id, started_at, finished_at)',
    )
    .eq('exercise_id', exerciseId)
    .eq('sessions.user_id', user.id)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false });
  if (error) throw new Error(error.message);

  type Row = {
    session_id: string;
    weight_kg: number;
    reps: number;
    completed_at: string | null;
    sessions: {
      user_id: string;
      started_at: string;
      finished_at: string | null;
    } | null;
  };

  const grouped = new Map<string, SessionForExerciseRow>();
  for (const r of (data ?? []) as Row[]) {
    if (!r.sessions) continue;
    const existing = grouped.get(r.session_id);
    if (!existing) {
      grouped.set(r.session_id, {
        session_id: r.session_id,
        started_at: r.sessions.started_at,
        finished_at: r.sessions.finished_at,
        setCount: 1,
        topWeight: r.weight_kg,
        topReps: r.reps,
      });
      continue;
    }
    existing.setCount += 1;
    if (
      r.weight_kg > existing.topWeight ||
      (r.weight_kg === existing.topWeight && r.reps > existing.topReps)
    ) {
      existing.topWeight = r.weight_kg;
      existing.topReps = r.reps;
    }
  }

  return Array.from(grouped.values()).sort((a, b) => {
    const aT = a.finished_at ?? a.started_at;
    const bT = b.finished_at ?? b.started_at;
    return new Date(bT).getTime() - new Date(aT).getTime();
  });
}

// --- date helpers (local to this file; non-exported) -----------------------

function mondayOfDate(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const wd = (out.getDay() + 6) % 7; // 0=Mon..6=Sun
  out.setDate(out.getDate() - wd);
  return out;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
