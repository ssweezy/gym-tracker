'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, 'Введите имя')
    .max(40, 'Слишком длинное имя'),
  goal: z.enum(['hypertrophy', 'strength', 'endurance']),
  unit_system: z.enum(['metric', 'imperial']),
  bodyweight_kg: z
    .number()
    .min(20, 'Проверьте вес')
    .max(400, 'Проверьте вес')
    .nullable(),
});

export interface UpdateProfileInput {
  display_name: string;
  goal: 'hypertrophy' | 'strength' | 'endurance';
  unit_system: 'metric' | 'imperial';
  bodyweight_kg: number | null;
}

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<{ error?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: parsed.data.display_name,
      goal: parsed.data.goal,
      unit_system: parsed.data.unit_system,
      bodyweight_kg: parsed.data.bodyweight_kg,
    })
    .eq('id', user.id);
  if (error) return { error: error.message };

  revalidatePath('/profile');
  revalidatePath('/');
  return {};
}
