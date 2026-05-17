'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  name: z.string().min(1, 'Введите название').max(80, 'Слишком длинное название'),
  muscle_groups: z.array(z.string()).min(1, 'Выберите хотя бы одну группу мышц'),
  increment_kg: z.number().min(0.5).max(20),
  description: z.string().max(800).optional(),
  technique_tips: z.array(z.string()).optional(),
  historical_fact: z.string().max(800).optional(),
  sub_muscles: z.array(z.string()).optional(),
});

export interface CreateExerciseFormInput {
  name: string;
  muscle_groups: string[];
  increment_kg: number;
  description?: string;
  technique_tips?: string[];
  historical_fact?: string;
  sub_muscles?: string[];
}

export async function createCustomExerciseAction(
  input: CreateExerciseFormInput,
): Promise<{ error?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };

  const tips =
    parsed.data.technique_tips
      ?.map((t) => t.trim())
      .filter((t) => t.length > 0) ?? [];

  const { error } = await supabase.from('exercises').insert({
    name: parsed.data.name.trim(),
    muscle_groups: parsed.data.muscle_groups,
    increment_kg: parsed.data.increment_kg,
    description: parsed.data.description?.trim() || null,
    technique_tips: tips.length > 0 ? tips : null,
    historical_fact: parsed.data.historical_fact?.trim() || null,
    sub_muscles:
      parsed.data.sub_muscles && parsed.data.sub_muscles.length > 0
        ? parsed.data.sub_muscles
        : null,
    is_system: false,
    user_id: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath('/exercises');
  redirect('/exercises');
}
