/**
 * Sanitize a post-auth `next` redirect: only same-origin absolute paths.
 * Rejects `//evil.com`, `/\evil.com`, `@evil.com` and anything not starting
 * with `/`, which would otherwise turn auth links into open redirects.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return '/';
  }
  return next;
}
