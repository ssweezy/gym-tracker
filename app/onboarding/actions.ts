'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { TablesInsert } from '@/types/supabase';

const onboardingSchema = z.object({
  display_name: z.string().min(1, 'Введите имя').max(50, 'Слишком длинное имя'),
  goal: z.enum(['hypertrophy', 'strength', 'endurance']),
  preset: z.enum(['fullbody3', 'upper_lower', 'split3']),
});

type Preset = z.infer<typeof onboardingSchema>['preset'];

type PlanDayInsert = Omit<TablesInsert<'plan_days'>, 'plan_id'>;

interface PresetConfig {
  name: string;
  days: PlanDayInsert[];
}

// weekday: 1=Mon ... 7=Sun
const PRESETS: Record<Preset, PresetConfig> = {
  fullbody3: {
    name: 'Фуллбоди · 3 раза в неделю',
    days: [
      { weekday: 1, order_idx: 0, is_rest: false, title: 'Фуллбоди A' },
      { weekday: 2, order_idx: 1, is_rest: true, title: 'Отдых' },
      { weekday: 3, order_idx: 2, is_rest: false, title: 'Фуллбоди B' },
      { weekday: 4, order_idx: 3, is_rest: true, title: 'Отдых' },
      { weekday: 5, order_idx: 4, is_rest: false, title: 'Фуллбоди C' },
      { weekday: 6, order_idx: 5, is_rest: true, title: 'Отдых' },
      { weekday: 7, order_idx: 6, is_rest: true, title: 'Отдых' },
    ],
  },
  upper_lower: {
    name: 'Сплит · Верх / Низ',
    days: [
      { weekday: 1, order_idx: 0, is_rest: false, title: 'Верх' },
      { weekday: 2, order_idx: 1, is_rest: false, title: 'Низ' },
      { weekday: 3, order_idx: 2, is_rest: true, title: 'Отдых' },
      { weekday: 4, order_idx: 3, is_rest: false, title: 'Верх' },
      { weekday: 5, order_idx: 4, is_rest: false, title: 'Низ' },
      { weekday: 6, order_idx: 5, is_rest: true, title: 'Отдых' },
      { weekday: 7, order_idx: 6, is_rest: true, title: 'Отдых' },
    ],
  },
  split3: {
    name: 'Сплит · Грудь+Трицепс / Спина+Бицепс / Ноги',
    days: [
      { weekday: 1, order_idx: 0, is_rest: false, title: 'Грудь · Трицепс' },
      { weekday: 2, order_idx: 1, is_rest: true, title: 'Отдых' },
      { weekday: 3, order_idx: 2, is_rest: false, title: 'Спина · Бицепс' },
      { weekday: 4, order_idx: 3, is_rest: true, title: 'Отдых' },
      { weekday: 5, order_idx: 4, is_rest: false, title: 'Ноги' },
      { weekday: 6, order_idx: 5, is_rest: true, title: 'Отдых' },
      { weekday: 7, order_idx: 6, is_rest: true, title: 'Отдых' },
    ],
  },
};

export async function completeOnboarding(
  formData: FormData,
): Promise<{ error?: string }> {
  const parsed = onboardingSchema.safeParse({
    display_name: formData.get('display_name'),
    goal: formData.get('goal'),
    preset: formData.get('preset'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  const { display_name, goal, preset } = parsed.data;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ display_name, goal })
    .eq('id', user.id);
  if (profileError) return { error: profileError.message };

  const config = PRESETS[preset];

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .insert({ user_id: user.id, name: config.name, is_active: true })
    .select('id')
    .single();
  if (planError || !plan) {
    return { error: planError?.message ?? 'Не удалось создать план' };
  }

  const dayRows = config.days.map((d) => ({ ...d, plan_id: plan.id }));
  const { error: daysError } = await supabase.from('plan_days').insert(dayRows);
  if (daysError) return { error: daysError.message };

  redirect('/');
}
