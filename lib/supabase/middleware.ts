import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/supabase';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // Login/forgot bounce signed-in users home. /auth/* (email-link handlers)
  // must always run — a recovery link opened while signed in still has to
  // verify its token and land on /account/recover.
  const isLoginPage = path === '/login' || path === '/forgot';
  const isPublic =
    isLoginPage || path.startsWith('/auth') || path === '/onboarding' || path.startsWith('/mockup');

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return response;
}
