'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getSystemExercises } from './exercises-static';
import type { ExerciseRow } from './types';

interface ListOptions {
  search?: string;
  muscle?: string;
}

// Russian muscle keywords → schema muscle_groups (English, lowercase).
// Each entry maps a Russian word that the user might type to one or more english groups.
const RU_MUSCLE_ALIASES: Array<{ keyword: string; groups: string[] }> = [
  { keyword: 'грудь', groups: ['chest'] },
  { keyword: 'спина', groups: ['back'] },
  { keyword: 'ноги', groups: ['legs', 'quads', 'glutes', 'hamstrings', 'calves'] },
  { keyword: 'квадрицепс', groups: ['quads'] },
  { keyword: 'квадрицепсы', groups: ['quads'] },
  { keyword: 'квадрицепса', groups: ['quads'] },
  { keyword: 'ягодицы', groups: ['glutes'] },
  { keyword: 'бицепс бедра', groups: ['hamstrings'] },
  { keyword: 'плечи', groups: ['shoulders'] },
  { keyword: 'дельты', groups: ['shoulders'] },
  { keyword: 'бицепс', groups: ['biceps'] },
  { keyword: 'трицепс', groups: ['triceps'] },
  { keyword: 'предплечья', groups: ['forearms'] },
  { keyword: 'икры', groups: ['calves'] },
  { keyword: 'пресс', groups: ['abs'] },
  { keyword: 'трапеции', groups: ['traps'] },
  { keyword: 'руки', groups: ['biceps', 'triceps', 'forearms'] },
];

function matchedMuscleGroups(rawInput: string): string[] {
  const q = rawInput.trim().toLowerCase();
  if (!q) return [];
  const out = new Set<string>();
  for (const { keyword, groups } of RU_MUSCLE_ALIASES) {
    if (keyword === q || keyword.includes(q) || q.includes(keyword)) {
      for (const g of groups) out.add(g);
    }
  }
  return Array.from(out);
}

function applyListFilters(
  rows: ExerciseRow[],
  opts: ListOptions,
): ExerciseRow[] {
  let out = rows;

  if (opts.search && opts.search.trim()) {
    const trimmed = opts.search.trim().toLowerCase();
    const muscleMatches = new Set(matchedMuscleGroups(trimmed));
    out = out.filter((ex) => {
      if (ex.name.toLowerCase().includes(trimmed)) return true;
      if (muscleMatches.size > 0) {
        for (const m of ex.muscle_groups) {
          if (muscleMatches.has(m)) return true;
        }
      }
      return false;
    });
  }

  if (opts.muscle && opts.muscle.trim()) {
    const m = opts.muscle.trim();
    out = out.filter((ex) => ex.muscle_groups.includes(m));
  }

  return out;
}

export async function listExercises(opts: ListOptions = {}): Promise<ExerciseRow[]> {
  // System exercises come from a cached, non-cookie anon client so we avoid a
  // per-request DB hit for the largest dataset. User-custom exercises must
  // come from the cookie-bound auth client to honour RLS.
  const supabase = await createClient();
  const [systemRows, customResult] = await Promise.all([
    getSystemExercises(),
    supabase
      .from('exercises')
      .select('*')
      .eq('is_system', false)
      .order('name', { ascending: true }),
  ]);

  if (customResult.error) throw new Error(customResult.error.message);
  const customRows = customResult.data ?? [];

  const merged = [...systemRows, ...customRows].sort((a, b) =>
    a.name.localeCompare(b.name, 'ru'),
  );

  return applyListFilters(merged, opts);
}

export async function getExerciseById(id: string): Promise<ExerciseRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getExerciseIdsInActivePlan(userId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data: plan } = await supabase
    .from('plans')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  if (!plan) return new Set();

  const { data: days } = await supabase
    .from('plan_days')
    .select('id')
    .eq('plan_id', plan.id);
  if (!days || days.length === 0) return new Set();

  const { data: planExercises } = await supabase
    .from('plan_exercises')
    .select('exercise_id')
    .in(
      'plan_day_id',
      days.map((d) => d.id),
    );

  return new Set((planExercises ?? []).map((pe) => pe.exercise_id));
}

interface CreateCustomExerciseInput {
  name: string;
  muscle_groups: string[];
  increment_kg: number;
  description?: string;
  technique_tips?: string[];
  historical_fact?: string;
}

export async function createCustomExercise(
  input: CreateCustomExerciseInput,
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  if (!input.name.trim()) return { error: 'Введите название' };
  if (input.muscle_groups.length === 0)
    return { error: 'Выберите хотя бы одну группу мышц' };

  const { data, error } = await supabase
    .from('exercises')
    .insert({
      name: input.name.trim(),
      muscle_groups: input.muscle_groups,
      increment_kg: input.increment_kg,
      description: input.description?.trim() || null,
      technique_tips:
        input.technique_tips && input.technique_tips.length > 0
          ? input.technique_tips
              .map((t) => t.trim())
              .filter((t) => t.length > 0)
          : null,
      historical_fact: input.historical_fact?.trim() || null,
      is_system: false,
      user_id: user.id,
    })
    .select('id')
    .single();

  if (error || !data) return { error: error?.message ?? 'Не удалось создать упражнение' };

  revalidatePath('/exercises');
  return { id: data.id };
}
