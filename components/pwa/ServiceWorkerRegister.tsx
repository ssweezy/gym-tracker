'use client';

import { useEffect } from 'react';

/**
 * Registers the app-shell service worker once on mount.
 *
 * Skips dev to avoid HMR weirdness (Next dev server already does its own thing
 * with module reloading; a SW intercepting fetches makes that miserable).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err: unknown) => {
          // Non-fatal: app works without SW, just no offline cache.
          // eslint-disable-next-line no-console
          console.warn('[sw] registration failed', err);
        });
    };

    // Defer to idle so SW registration never competes with first paint.
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}
