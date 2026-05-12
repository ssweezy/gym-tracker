import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import type { Database } from '@/types/supabase';
import type { ExerciseRow } from './types';

/**
 * Build a NON-cookie-bound anon client. System rows (`is_system=true`) are
 * publicly readable via RLS so this client is safe to call without user
 * context. Used only for fetching the global system-exercises catalog that
 * is identical for every user.
 *
 * Do NOT use this client for any user-scoped data.
 */
function anonClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}

async function fetchSystemExercises(): Promise<ExerciseRow[]> {
  const supabase = anonClient();
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('is_system', true)
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Cached, request-deduplicated read of all system exercises. Cache is keyed by
 * the literal tag `system-exercises` and revalidates every hour. Server actions
 * that mutate the system catalog (none currently) should call
 * `revalidateTag('system-exercises')`.
 */
export const getSystemExercises = unstable_cache(
  fetchSystemExercises,
  ['system-exercises'],
  { revalidate: 3600, tags: ['system-exercises'] },
);
