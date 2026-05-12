'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  password: z.string().min(6, 'Минимум 6 символов'),
});

export async function setNewPassword(
  formData: FormData,
): Promise<{ error?: string }> {
  const parsed = schema.safeParse({ password: formData.get('password') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Сессия восстановления истекла. Запросите ссылку снова.' };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };

  redirect('/');
}
