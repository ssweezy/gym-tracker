'use server';

import { headers } from 'next/headers';
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

  // The email link itself is built by the Supabase "Reset Password" template
  // from Site URL + token_hash (see app/auth/confirm/route.ts). redirectTo is
  // still sent so the URL is validated against the Auth allow-list; it's
  // derived from the incoming request so it can never point at localhost in
  // production.
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const origin = host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL;

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: origin ? `${origin}/auth/confirm?next=/account/recover` : undefined,
  });

  // Don't leak existence of the account. Always respond with success.
  if (error) {
    // Log on the server for diagnostics; user-facing remains opaque.
    console.error('resetPasswordForEmail', error.message);
  }
  return { ok: true };
}
