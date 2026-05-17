'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { SeasonSummary } from './types';

interface SeasonRow {
  id: string;
  name: string;
  started_at: string;
  ended_at: string | null;
}

/**
 * The user's active season, creating one lazily if none exists. On first
 * creation any pre-existing season-less sessions are adopted into it so old
 * data becomes "Сезон 1" rather than vanishing.
 */
export async function ensureActiveSeason(): Promise<SeasonRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: active } = await supabase
    .from('seasons')
    .select('id, name, started_at, ended_at')
    .eq('user_id', user.id)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (active) return active as SeasonRow;

  const { count } = await supabase
    .from('seasons')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const { data: created, error } = await supabase
    .from('seasons')
    .insert({ user_id: user.id, name: `Сезон ${(count ?? 0) + 1}` })
    .select('id, name, started_at, ended_at')
    .single();
  if (error || !created) return null;

  // Adopt legacy season-less sessions into the very first season.
  await supabase
    .from('sessions')
    .update({ season_id: created.id })
    .eq('user_id', user.id)
    .is('season_id', null);

  return created as SeasonRow;
}

/** Active season id, or null (no auth). Convenience wrapper. */
export async function getActiveSeasonId(): Promise<string | null> {
  return (await ensureActiveSeason())?.id ?? null;
}

/** All seasons (newest first) with their workout counts. */
export async function listSeasons(): Promise<SeasonSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  await ensureActiveSeason();

  const { data: seasons } = await supabase
    .from('seasons')
    .select('id, name, started_at, ended_at')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false });
  if (!seasons || seasons.length === 0) return [];

  const { data: sessions } = await supabase
    .from('sessions')
    .select('season_id')
    .eq('user_id', user.id)
    .not('finished_at', 'is', null);

  const counts = new Map<string, number>();
  for (const s of sessions ?? []) {
    if (!s.season_id) continue;
    counts.set(s.season_id, (counts.get(s.season_id) ?? 0) + 1);
  }

  return seasons.map((s) => ({
    id: s.id,
    name: s.name,
    started_at: s.started_at,
    ended_at: s.ended_at,
    is_active: s.ended_at === null,
    workout_count: counts.get(s.id) ?? 0,
  }));
}

/**
 * Close the current season under the given name and open a fresh one.
 * Existing workouts stay attached to the now-archived season (kept, not
 * deleted); stats/history reset because they scope to the new active season.
 */
export async function startNewSeason(
  currentName: string,
): Promise<{ error?: string }> {
  const name = currentName.trim();
  if (!name) return { error: 'Введите название сезона' };
  if (name.length > 60) return { error: 'Слишком длинное название' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  const current = await ensureActiveSeason();
  if (!current) return { error: 'Не удалось определить текущий сезон' };

  const { error: closeErr } = await supabase
    .from('seasons')
    .update({ name, ended_at: new Date().toISOString() })
    .eq('id', current.id)
    .eq('user_id', user.id);
  if (closeErr) return { error: closeErr.message };

  const { count } = await supabase
    .from('seasons')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const { error: openErr } = await supabase
    .from('seasons')
    .insert({ user_id: user.id, name: `Сезон ${(count ?? 1) + 1}` });
  if (openErr) return { error: openErr.message };

  revalidatePath('/progress');
  revalidatePath('/profile');
  revalidatePath('/');
  return {};
}
