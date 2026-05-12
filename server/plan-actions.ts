'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { RepCategory } from '@/lib/progression';
import type { PlanPreset, PlanDayInsert } from './types';
import { PLAN_PRESETS, EMPTY_PLAN_DAYS, HIDDEN_PLAN_NAME } from './plan-presets';

export async function addExerciseToPlanDay(
  planDayId: string,
  exerciseId: string,
  repCategory: RepCategory,
  targetSets: number,
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  const { data: existing } = await supabase
    .from('plan_exercises')
    .select('order_idx')
    .eq('plan_day_id', planDayId)
    .order('order_idx', { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].order_idx + 1 : 0;

  const { data, error } = await supabase
    .from('plan_exercises')
    .insert({
      plan_day_id: planDayId,
      exercise_id: exerciseId,
      rep_category: repCategory,
      target_sets: targetSets,
      order_idx: nextOrder,
    })
    .select('id')
    .single();
  if (error || !data) return { error: error?.message ?? 'Не удалось добавить упражнение' };

  revalidatePath('/plan');
  revalidatePath(`/plan/edit/${planDayId}`);
  revalidatePath('/');
  return { id: data.id };
}

export async function updatePlanExercise(
  id: string,
  patch: { rep_category?: RepCategory; target_sets?: number },
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  const { error } = await supabase.from('plan_exercises').update(patch).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/plan');
  revalidatePath('/');
  return {};
}

export async function removePlanExercise(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  const { error } = await supabase.from('plan_exercises').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/plan');
  revalidatePath('/');
  return {};
}

/**
 * Best-effort deactivation: clears `is_active` on whichever plan the
 * user has currently active (idempotent). Returned ID is the previously
 * active plan, if any — used so callers can roll back when a subsequent
 * activate fails.
 */
async function deactivateActivePlanReturn(
  userId: string,
): Promise<{ id: string | null; error?: string }> {
  const supabase = await createClient();
  const { data: current, error: lookupErr } = await supabase
    .from('plans')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  if (lookupErr) return { id: null, error: lookupErr.message };
  if (!current) return { id: null };

  const { error } = await supabase
    .from('plans')
    .update({ is_active: false })
    .eq('id', current.id);
  if (error) return { id: null, error: error.message };
  return { id: current.id };
}

async function insertPlanWithDays(
  userId: string,
  name: string,
  days: PlanDayInsert[],
  isActive: boolean,
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .insert({ user_id: userId, name, is_active: isActive })
    .select('id')
    .single();
  if (planError || !plan) {
    return { error: planError?.message ?? 'Не удалось создать план' };
  }
  const rows = days.map((d) => ({ ...d, plan_id: plan.id }));
  const { error: daysError } = await supabase.from('plan_days').insert(rows);
  if (daysError) return { error: daysError.message };
  return { id: plan.id };
}

/**
 * Switch the user's active plan. Best-effort sequence:
 *  1) Find current active plan id (rollback target).
 *  2) Deactivate it.
 *  3) Activate the requested plan.
 *  4) On step 3 failure, restore the previously-active plan so the user
 *     is never left without an active plan.
 *
 * RLS limits the update to the user's own plans, so ownership is
 * enforced implicitly. We still verify existence up front to return a
 * friendlier error.
 */
export async function activatePlan(
  planId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  const { data: target, error: targetErr } = await supabase
    .from('plans')
    .select('id, name')
    .eq('id', planId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (targetErr) return { error: targetErr.message };
  if (!target) return { error: 'План не найден' };
  if (target.name === HIDDEN_PLAN_NAME) {
    return { error: 'Этот план нельзя активировать' };
  }

  const prev = await deactivateActivePlanReturn(user.id);
  if (prev.error) return { error: prev.error };
  if (prev.id === planId) {
    // Already active — re-set the flag in case it was just cleared.
    const { error } = await supabase
      .from('plans')
      .update({ is_active: true })
      .eq('id', planId);
    if (error) return { error: error.message };
    revalidatePath('/plan');
    revalidatePath('/');
    return {};
  }

  const { error: activateErr } = await supabase
    .from('plans')
    .update({ is_active: true })
    .eq('id', planId);
  if (activateErr) {
    // Roll back: re-activate the previously active plan if any.
    if (prev.id) {
      await supabase
        .from('plans')
        .update({ is_active: true })
        .eq('id', prev.id);
    }
    return { error: activateErr.message };
  }

  revalidatePath('/plan');
  revalidatePath('/');
  return {};
}

export async function createCustomPlan(
  name: string,
): Promise<{ id?: string; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: 'Введите название плана' };
  if (trimmed === HIDDEN_PLAN_NAME) return { error: 'Недопустимое имя' };
  if (trimmed.length > 80) return { error: 'Слишком длинное название' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  const created = await insertPlanWithDays(
    user.id,
    trimmed,
    EMPTY_PLAN_DAYS,
    false,
  );
  if (created.error) return { error: created.error };

  revalidatePath('/plan');
  revalidatePath('/');
  return { id: created.id };
}

export async function createPlanFromPreset(
  name: string,
  preset: PlanPreset,
): Promise<{ id?: string; error?: string }> {
  const config = PLAN_PRESETS[preset];
  if (!config) return { error: 'Неизвестный пресет' };

  const trimmed = name.trim();
  if (!trimmed) return { error: 'Введите название плана' };
  if (trimmed === HIDDEN_PLAN_NAME) return { error: 'Недопустимое имя' };
  if (trimmed.length > 80) return { error: 'Слишком длинное название' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  const created = await insertPlanWithDays(user.id, trimmed, config.days, false);
  if (created.error) return { error: created.error };

  revalidatePath('/plan');
  revalidatePath('/');
  return { id: created.id };
}

export async function renamePlan(
  planId: string,
  name: string,
): Promise<{ error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: 'Введите название плана' };
  if (trimmed === HIDDEN_PLAN_NAME) return { error: 'Недопустимое имя' };
  if (trimmed.length > 80) return { error: 'Слишком длинное название' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  const { data: target, error: lookupErr } = await supabase
    .from('plans')
    .select('id, name')
    .eq('id', planId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (lookupErr) return { error: lookupErr.message };
  if (!target) return { error: 'План не найден' };
  if (target.name === HIDDEN_PLAN_NAME) {
    return { error: 'Этот план нельзя переименовать' };
  }

  const { error } = await supabase
    .from('plans')
    .update({ name: trimmed })
    .eq('id', planId);
  if (error) return { error: error.message };

  revalidatePath('/plan');
  revalidatePath('/');
  return {};
}

export async function deletePlan(
  planId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  const { data: target, error: lookupErr } = await supabase
    .from('plans')
    .select('id, name, is_active')
    .eq('id', planId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (lookupErr) return { error: lookupErr.message };
  if (!target) return { error: 'План не найден' };
  if (target.name === HIDDEN_PLAN_NAME) {
    return { error: 'Системный план нельзя удалить' };
  }

  const { data: namedPlans, error: countErr } = await supabase
    .from('plans')
    .select('id, created_at')
    .eq('user_id', user.id)
    .neq('name', HIDDEN_PLAN_NAME);
  if (countErr) return { error: countErr.message };
  if (!namedPlans || namedPlans.length < 2) {
    return { error: 'Нельзя удалить единственный план' };
  }

  const { error: delErr } = await supabase
    .from('plans')
    .delete()
    .eq('id', planId);
  if (delErr) return { error: delErr.message };

  if (target.is_active) {
    // Promote the most-recently-created remaining plan to active.
    const candidates = namedPlans
      .filter((p) => p.id !== planId)
      .sort((a, b) => {
        const ta = a.created_at ?? '';
        const tb = b.created_at ?? '';
        return ta < tb ? 1 : ta > tb ? -1 : 0;
      });
    const next = candidates[0];
    if (next) {
      await supabase
        .from('plans')
        .update({ is_active: true })
        .eq('id', next.id);
    }
  }

  revalidatePath('/plan');
  revalidatePath('/');
  return {};
}

/**
 * Replaces the active plan by creating a new plan from the preset and
 * activating it. The previously active plan stays in the library.
 */
export async function applyPreset(
  preset: PlanPreset,
): Promise<{ id?: string; error?: string }> {
  const config = PLAN_PRESETS[preset];
  if (!config) return { error: 'Неизвестный пресет' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  const prev = await deactivateActivePlanReturn(user.id);
  if (prev.error) return { error: prev.error };

  const created = await insertPlanWithDays(
    user.id,
    config.name,
    config.days,
    true,
  );
  if (created.error) {
    // Roll back: re-activate the previously-active plan so the user is
    // not left with zero active plans.
    if (prev.id) {
      await supabase
        .from('plans')
        .update({ is_active: true })
        .eq('id', prev.id);
    }
    return { error: created.error };
  }

  revalidatePath('/plan');
  revalidatePath('/');
  return { id: created.id };
}

/**
 * Legacy alias: create an empty "Свой план" and activate it. Equivalent
 * to `createCustomPlan('Свой план')` followed by `activatePlan`.
 */
export async function clearPlan(): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  const prev = await deactivateActivePlanReturn(user.id);
  if (prev.error) return { error: prev.error };

  const created = await insertPlanWithDays(
    user.id,
    'Свой план',
    EMPTY_PLAN_DAYS,
    true,
  );
  if (created.error) {
    if (prev.id) {
      await supabase
        .from('plans')
        .update({ is_active: true })
        .eq('id', prev.id);
    }
    return { error: created.error };
  }

  revalidatePath('/plan');
  revalidatePath('/');
  return { id: created.id };
}

export async function deleteActivePlan(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  const { error } = await supabase
    .from('plans')
    .update({ is_active: false })
    .eq('user_id', user.id)
    .eq('is_active', true);
  if (error) return { error: error.message };

  revalidatePath('/plan');
  revalidatePath('/');
  return {};
}

export async function setDayWorkout(
  planDayId: string,
  title: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  const { error } = await supabase
    .from('plan_days')
    .update({ is_rest: false, title })
    .eq('id', planDayId);
  if (error) return { error: error.message };

  revalidatePath('/plan');
  revalidatePath(`/plan/edit/${planDayId}`);
  revalidatePath('/');
  return {};
}

export async function setDayRest(
  planDayId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  // Keep plan_exercises rows — safer per spec. Only flip is_rest and reset title.
  const { error } = await supabase
    .from('plan_days')
    .update({ is_rest: true, title: 'Отдых' })
    .eq('id', planDayId);
  if (error) return { error: error.message };

  revalidatePath('/plan');
  revalidatePath(`/plan/edit/${planDayId}`);
  revalidatePath('/');
  return {};
}
