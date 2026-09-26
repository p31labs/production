/* P31 Design Portal — service worker (p31-enterprise-baseline).
 *
 * Cache strategy (v3 — hardened against deploy-race poisoning):
 *   - Navigation (HTML): NETWORK-FIRST. The fresh deploy's index.html always
 *     wins when online; the cached shell is only an offline fallback. This
 *     prevents an old cached shell from referencing assets that no longer
 *     exist in the current deploy (the "white page after deploy" bug).
 *   - Sub-resources (CSS/JS/IMG): CACHE-FIRST, but ONLY cache a response whose
 *     Content-Type matches the URL's expected type. A text/html SPA fallback
 *     can never be stored under a .css/.js URL again (the poisoning vector).
 *   - API: NETWORK-FIRST with a cached/offline fallback.
 * Cache name design-v3: activate purges all older caches (v1/v2).
 */
const CACHE = 'design-v3';
const API_PREFIX = ['/api/', '/mcp', '/resources/'];

const PRECACHE = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

const TYPE_BY_EXT = {
  '.css': 'text/css',
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.json': 'json',
  '.webmanifest': 'manifest',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.xml': 'text/xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.html': 'text/html',
};

function typeMatches(url, res) {
  const ext = url.pathname.slice(url.pathname.lastIndexOf('.')).toLowerCase();
  const expected = TYPE_BY_EXT[ext];
  if (!expected) return true; // unknown extension → allow (never block a font/image)
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  return ct.includes(expected);
}

self.addEventListener('install', (e) => {
  // Tolerant precache: a single missing file must NOT keep the old SW in
  // control forever (that is how stale shells persist across deploys).
  e.waitUntil(
    Promise.all(
      PRECACHE.map((p) =>
        fetch(p).then((res) => {
          if (res.ok) return caches.open(CACHE).then((c) => c.put(p, res.clone()));
        }).catch(() => {}),
      ),
    ).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  const isApi = API_PREFIX.some((p) => url.pathname.startsWith(p));
  if (isApi) {
    e.respondWith(fetch(e.request).then((res) => { const c = res.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return res; })
      .catch(() => caches.match(e.request).then((m) => m || new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } }))));
    return;
  }

  const isDocument = e.request.mode === 'navigate' || e.request.destination === 'document';

  if (isDocument) {
    // NETWORK-FIRST for the HTML shell.
    e.respondWith(
      fetch(e.request).then((res) => {
        if (res.ok && typeMatches(url, res)) {
          const c = res.clone();
          caches.open(CACHE).then((x) => x.put(e.request, c));
        }
        return res;
      }).catch(() => caches.match(e.request).then((m) => m || caches.match('/').then((shell) => shell || new Response('offline', { status: 503 })))),
    );
    return;
  }

  // Sub-resource: CACHE-FIRST with a Content-Type guard (no HTML poisoning).
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit && typeMatches(url, hit)) return hit;
      if (hit) caches.open(CACHE).then((c) => c.delete(e.request)); // evict a poisoned entry
      return fetch(e.request).then((res) => {
        if (res.ok && typeMatches(url, res)) {
          const c = res.clone();
          caches.open(CACHE).then((x) => x.put(e.request, c));
        }
        return res;
      }).catch(() => new Response('', { status: 503 }));
    }),
  );
});