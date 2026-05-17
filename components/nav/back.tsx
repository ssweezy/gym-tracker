'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { tapSoft } from '@/lib/haptics';

const COUNT_KEY = 'app_nav_count';

function readCount(): number {
  if (typeof window === 'undefined') return 0;
  const n = Number(sessionStorage.getItem(COUNT_KEY));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Counts in-app page visits for this tab. Mounted once in the app layout.
 * `app_nav_count > 1` means there is at least one earlier in-app page, so
 * `router.back()` is guaranteed to stay inside the app (and lands on the
 * ACTUAL previous screen — not a hardcoded root).
 */
export function NavHistoryTracker() {
  const pathname = usePathname();
  useEffect(() => {
    sessionStorage.setItem(COUNT_KEY, String(readCount() + 1));
  }, [pathname]);
  return null;
}

interface BackLinkProps {
  /** Where to go when there is no in-app history (deep link / PWA cold start). */
  fallback: string;
  /** Breadcrumb-style label for the parent section. */
  label: string;
  className?: string;
}

/**
 * Back control that returns to the real previous screen via history when
 * possible, otherwise navigates to the section parent. Replaces hardcoded
 * `<Link href="/parent">` back links that always jumped to the start.
 */
export function BackLink({ fallback, label, className }: BackLinkProps) {
  const router = useRouter();

  function onClick() {
    tapSoft();
    if (readCount() > 1) router.back();
    else router.push(fallback);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        className ??
        'inline-flex items-center gap-1 text-[13px] font-medium text-text-tertiary active:text-text-secondary'
      }
    >
      <ArrowLeft size={14} /> {label}
    </button>
  );
}
