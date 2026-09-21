/**
 * QPJ → music maker proxy (Pages Function, catch-all).
 *
 * Serves the spatial music maker SAME-ORIGIN on qpj.p31ca.org by proxying
 * three path families to the deployed music-presence worker:
 *
 *   /api/music/*      → worker /api/music/*   (the instrument's relative calls)
 *   /song.html        → worker /             (the instrument's SPA entry)
 *   /assets/*         → worker /assets/*     (the instrument's built bundle)
 *
 * The browser only ever talks to QPJ's own origin — the instrument's client
 * uses relative /api/music/* paths and a WS upgrade to /api/music/stream, so
 * same-origin is what makes them work. Identity (the Cloudflare Access cookie,
 * when wired) is carried server-side to the worker's room-key derivation.
 */

const WORKER = 'https://music-presence.trimtab-signal.workers.dev';

export const onRequest: PagesFunction = async ({ request, url }) => {
  // SPA entry: the instrument's own index.html at /song.html.
  if (url.pathname === '/song.html') {
    return fetch(new URL('/', WORKER));
  }

  // Built assets.
  if (url.pathname.startsWith('/assets/')) {
    return fetch(new URL(url.pathname, WORKER));
  }

  // API + WS stream. Paths arrive as /api/music/<suffix>.
  if (url.pathname.startsWith('/api/music/')) {
    const suffix = url.pathname.slice('/api/music/'.length);
    const target = new URL(`/api/music/${suffix}`, WORKER);
    target.search = url.search;

    const upgrade = request.headers.get('Upgrade');
    if (upgrade?.toLowerCase() === 'websocket') {
      return fetch(target.toString(), request); // the worker does the DO upgrade
    }

    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.set('x-forwarded-host', url.host);
    const init: RequestInit = {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
    };
    return fetch(target.toString(), init);
  }

  return new Response('not found', { status: 404 });
};