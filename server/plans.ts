import { createClient } from '@/lib/supabase/server';
import type { Tables } from '@/types/supabase';
import type { MuscleGroup } from '@/lib/volume';
import type { RepCategory } from '@/lib/progression';
import { HIDDEN_PLAN_NAME } from './plan-presets';

export type PlanRow = Tables<'plans'>;
export type PlanDayRow = Tables<'plan_days'>;
export type PlanExerciseRow = Tables<'plan_exercises'>;
export type ExerciseRow = Tables<'exercises'>;

export interface PlanExerciseWithExercise extends PlanExerciseRow {
  exercise: ExerciseRow;
}

export interface PlanDayWithExercises extends PlanDayRow {
  exercises: PlanExerciseWithExercise[];
}

export interface ActivePlanFull {
  plan: PlanRow;
  days: PlanDayWithExercises[];
}

export async function getActivePlan(userId: string): Promise<ActivePlanFull | null> {
  const supabase = await createClient();

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  if (planError) throw new Error(planError.message);
  if (!plan) return null;

  const { data: days, error: daysError } = await supabase
    .from('plan_days')
    .select('*')
    .eq('plan_id', plan.id)
    .order('order_idx', { ascending: true });
  if (daysError) throw new Error(daysError.message);

  const dayIds = (days ?? []).map((d) => d.id);
  let planExercises: Array<PlanExerciseRow & { exercise: ExerciseRow }> = [];
  if (dayIds.length > 0) {
    const { data: pe, error: peError } = await supabase
      .from('plan_exercises')
      .select('*, exercise:exercises(*)')
      .in('plan_day_id', dayIds)
      .order('order_idx', { ascending: true });
    if (peError) throw new Error(peError.message);
    planExercises = (pe ?? []) as Array<PlanExerciseRow & { exercise: ExerciseRow }>;
  }

  const byDay = new Map<string, PlanExerciseWithExercise[]>();
  for (const pe of planExercises) {
    const arr = byDay.get(pe.plan_day_id) ?? [];
    arr.push(pe);
    byDay.set(pe.plan_day_id, arr);
  }

  return {
    plan,
    days: (days ?? []).map((d) => ({
      ...d,
      exercises: byDay.get(d.id) ?? [],
    })),
  };
}

export async function getPlanDay(dayId: string): Promise<PlanDayWithExercises | null> {
  const supabase = await createClient();

  const { data: day, error: dayError } = await supabase
    .from('plan_days')
    .select('*')
    .eq('id', dayId)
    .maybeSingle();
  if (dayError) throw new Error(dayError.message);
  if (!day) return null;

  const { data: pe, error: peError } = await supabase
    .from('plan_exercises')
    .select('*, exercise:exercises(*)')
    .eq('plan_day_id', dayId)
    .order('order_idx', { ascending: true });
  if (peError) throw new Error(peError.message);

  return {
    ...day,
    exercises: (pe ?? []) as PlanExerciseWithExercise[],
  };
}

export function planDayMuscles(day: PlanDayWithExercises): MuscleGroup[] {
  const set = new Set<MuscleGroup>();
  for (const pe of day.exercises) {
    for (const m of pe.exercise.muscle_groups as MuscleGroup[]) {
      set.add(m);
    }
  }
  return Array.from(set);
}

export interface WorkoutTemplate {
  planDayId: string;
  planName: string;
  isActivePlan: boolean;
  weekday: number;
  title: string | null;
  exercises: Array<{
    exercise_id: string;
    exercise_name: string;
    rep_category: RepCategory;
    target_sets: number;
    muscle_groups: string[];
    is_system: boolean;
  }>;
}

/**
 * All non-rest plan_days across the user's plans (excluding the hidden
 * `__extra__` plan) that have at least one exercise. Used to seed the
 * ad-hoc builder from a planned day.
 *
 * Sort order: active plan first, then by plan `created_at` desc; within
 * a plan, by weekday ascending.
 */
export async function listWorkoutTemplates(
  userId: string,
): Promise<WorkoutTemplate[]> {
  const supabase = await createClient();

  const { data: plans, error: plansError } = await supabase
    .from('plans')
    .select('id, name, is_active, created_at')
    .eq('user_id', userId)
    .neq('name', HIDDEN_PLAN_NAME)
    .order('created_at', { ascending: false });
  if (plansError) throw new Error(plansError.message);
  if (!plans || plans.length === 0) return [];

  const planIds = plans.map((p) => p.id);
  const { data: days, error: daysError } = await supabase
    .from('plan_days')
    .select('id, plan_id, weekday, title, is_rest')
    .in('plan_id', planIds)
    .eq('is_rest', false);
  if (daysError) throw new Error(daysError.message);
  if (!days || days.length === 0) return [];

  const dayIds = days.map((d) => d.id);
  const { data: pe, error: peError } = await supabase
    .from('plan_exercises')
    .select('plan_day_id, exercise_id, rep_category, target_sets, order_idx, exercise:exercises(name, muscle_groups, is_system)')
    .in('plan_day_id', dayIds)
    .order('order_idx', { ascending: true });
  if (peError) throw new Error(peError.message);

  const byDay = new Map<string, WorkoutTemplate['exercises']>();
  for (const row of pe ?? []) {
    const ex = (row as unknown as {
      plan_day_id: string;
      exercise_id: string;
      rep_category: string;
      target_sets: number;
      exercise: { name: string; muscle_groups: string[]; is_system: boolean | null } | null;
    });
    if (!ex.exercise) continue;
    const list = byDay.get(ex.plan_day_id) ?? [];
    list.push({
      exercise_id: ex.exercise_id,
      exercise_name: ex.exercise.name,
      rep_category: ex.rep_category as RepCategory,
      target_sets: ex.target_sets,
      muscle_groups: ex.exercise.muscle_groups,
      is_system: ex.exercise.is_system ?? true,
    });
    byDay.set(ex.plan_day_id, list);
  }

  const planById = new Map(plans.map((p) => [p.id, p]));

  const templates: Array<WorkoutTemplate & { _planCreatedAt: string }> = [];
  for (const d of days) {
    const exs = byDay.get(d.id);
    if (!exs || exs.length === 0) continue;
    const plan = planById.get(d.plan_id);
    if (!plan) continue;
    templates.push({
      planDayId: d.id,
      planName: plan.name,
      isActivePlan: plan.is_active === true,
      weekday: d.weekday,
      title: d.title,
      exercises: exs,
      _planCreatedAt: plan.created_at ?? '',
    });
  }

  templates.sort((a, b) => {
    if (a.isActivePlan !== b.isActivePlan) return a.isActivePlan ? -1 : 1;
    if (a._planCreatedAt !== b._planCreatedAt) {
      return a._planCreatedAt < b._planCreatedAt ? 1 : -1;
    }
    return a.weekday - b.weekday;
  });

  // Drop the internal sort helper field before returning.
  return templates.map(({ _planCreatedAt, ...t }) => {
    void _planCreatedAt;
    return t;
  });
}

export interface PlanSummary {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string | null;
  workoutDays: number;
  totalExercises: number;
}

/**
 * Summary list of the user's named plans (excluding the hidden
 * `__extra__` plan). Active first, then most recently created.
 */
export async function listUserPlans(userId: string): Promise<PlanSummary[]> {
  const supabase = await createClient();

  const { data: plans, error: plansError } = await supabase
    .from('plans')
    .select('id, name, is_active, created_at')
    .eq('user_id', userId)
    .neq('name', HIDDEN_PLAN_NAME)
    .order('created_at', { ascending: false });
  if (plansError) throw new Error(plansError.message);
  if (!plans || plans.length === 0) return [];

  const planIds = plans.map((p) => p.id);
  const { data: days, error: daysError } = await supabase
    .from('plan_days')
    .select('id, plan_id, is_rest')
    .in('plan_id', planIds);
  if (daysError) throw new Error(daysError.message);

  const dayIdsByPlan = new Map<string, string[]>();
  const restByDayId = new Map<string, boolean>();
  for (const d of days ?? []) {
    restByDayId.set(d.id, d.is_rest);
    const list = dayIdsByPlan.get(d.plan_id) ?? [];
    list.push(d.id);
    dayIdsByPlan.set(d.plan_id, list);
  }

  const allDayIds = Array.from(restByDayId.keys());
  const countsByDay = new Map<string, number>();
  if (allDayIds.length > 0) {
    const { data: pe, error: peError } = await supabase
      .from('plan_exercises')
      .select('plan_day_id')
      .in('plan_day_id', allDayIds);
    if (peError) throw new Error(peError.message);
    for (const row of pe ?? []) {
      countsByDay.set(row.plan_day_id, (countsByDay.get(row.plan_day_id) ?? 0) + 1);
    }
  }

  const summaries: PlanSummary[] = plans.map((p) => {
    const dayIds = dayIdsByPlan.get(p.id) ?? [];
    let workoutDays = 0;
    let totalExercises = 0;
    for (const did of dayIds) {
      const isRest = restByDayId.get(did) ?? true;
      const cnt = countsByDay.get(did) ?? 0;
      if (!isRest && cnt > 0) workoutDays += 1;
      if (!isRest) totalExercises += cnt;
    }
    return {
      id: p.id,
      name: p.name,
      is_active: p.is_active === true,
      created_at: p.created_at,
      workoutDays,
      totalExercises,
    };
  });

  summaries.sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    const ta = a.created_at ?? '';
    const tb = b.created_at ?? '';
    if (ta !== tb) return ta < tb ? 1 : -1;
    return 0;
  });

  return summaries;
}

