/* MCP Marketplace — service worker (p31-enterprise-baseline, v2).
   Strategy: network-first HTML (so deploys always take effect),
   stale-while-revalidate for hashed immutable assets, network-first API
   with offline fallback. Cache name is versioned; bumping it busts the
   old cache on activate. */
const CACHE = 'marketplace-v2';
const API_PREFIX = ['/api/', '/mcp', '/resources/'];

self.addEventListener('install', (e) => {
  // No precache of '/' — HTML is network-first; precaching it is what pinned
  // stale index.html across deploys.
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/manifest.webmanifest'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  // API: network-first with cached/offline fallback.
  if (API_PREFIX.some((p) => url.pathname.startsWith(p))) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const c = res.clone();
          caches.open(CACHE).then((x) => x.put(e.request, c));
          return res;
        })
        .catch(() =>
          caches.match(e.request).then(
            (m) => m || new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } }),
          ),
        ),
    );
    return;
  }

  // Navigations / HTML: network-first so new deploys apply immediately;
  // fall back to the cached shell only when offline.
  const isNav = e.request.mode === 'navigate' || (e.request.headers.get('Accept') || '').includes('text/html');
  if (isNav) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const c = res.clone();
          caches.open(CACHE).then((x) => x.put('/shell', c));
          return res;
        })
        .catch(() => caches.match('/shell').then((m) => m || caches.match(e.request))),
    );
    return;
  }

  // Hashed assets: stale-while-revalidate (instant load, refreshed in background).
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const refresh = fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const c = res.clone();
            caches.open(CACHE).then((x) => x.put(e.request, c));
          }
          return res;
        })
        .catch(() => undefined);
      return hit || refresh;
    }),
  );
});