/* Gym Tracker service worker — MVP app-shell + offline navigation fallback */
/* eslint-disable */

const CACHE_VERSION = 'gym-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// App shell pre-cached on install.
const APP_SHELL = [
  '/',
  '/login',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/icon-maskable.svg',
  '/icons/apple-touch-icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        // Use addAll with individual requests so a single 404 doesn't kill install.
        Promise.all(
          APP_SHELL.map((url) =>
            cache
              .add(new Request(url, { cache: 'reload' }))
              .catch(() => undefined),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(CACHE_VERSION))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET — let the network deal with everything else.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Same-origin only; cross-origin (CDN/API) passes through untouched.
  if (url.origin !== self.location.origin) return;

  // 1) Navigation (HTML): network-first, fall back to cache, then offline page.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          const shell = await caches.match('/');
          if (shell) return shell;
          const offline = await caches.match('/offline.html');
          if (offline) return offline;
          return new Response('Offline', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }),
    );
    return;
  }

  // 2) Static assets: cache-first.
  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest' ||
    /\.(?:css|js|woff2?|ttf|otf|svg|png|jpg|jpeg|gif|webp|ico)$/.test(
      url.pathname,
    );

  if (isStatic) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok && (res.type === 'basic' || res.type === 'default')) {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        });
      }),
    );
    return;
  }

  // 3) API / SSR data / everything else: pass through (network-only).
  // No caching here — RSC payloads, server actions, and Supabase calls
  // should always hit the network so users see fresh data.
});
