'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  email: z.string().email('Неверный email'),
});

export async function requestPasswordReset(
  formData: FormData,
): Promise<{ ok?: true; error?: string }> {
  const parsed = schema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/account/recover`,
  });

  // Don't leak existence of the account. Always respond with success.
  if (error) {
    // Log on the server for diagnostics; user-facing remains opaque.
    console.error('resetPasswordForEmail', error.message);
  }
  return { ok: true };
}
