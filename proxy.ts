import { updateSession } from '@/lib/supabase/middleware';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip Next.js internals, static assets, PWA artifacts (manifest, service worker,
    // icons, offline shell). The SW MUST be reachable unauthenticated — otherwise
    // the browser can't fetch it for the install criteria, and the offline page
    // can't be cached.
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest|sw\\.js|offline\\.html|.*\\.(?:png|jpg|svg)).*)',
  ],
};
