/**
 * QPJ → music maker proxy (Pages Function, catch-all).
 *
 * Serves the spatial music maker SAME-ORIGIN on qpj.p31ca.org by proxying to
 * the deployed music-presence worker:
 *
 *   /song.html        → worker /             (the instrument's SPA entry)
 *   /song-assets/*    → worker /assets/*     (the instrument's built bundle)
 *   /api/music/*      → worker /api/music/*  (the instrument's relative calls)
 *
 * The instrument's SPA (served at /song.html through this function) references
 * its assets as /assets/index-<hash>.js — but QPJ has its OWN /assets/* with
 * the same shape, so a naive proxy would collide. The instrument's SPA is
 * rewritten at the proxy to point /assets/* at /song-assets/*, which only this
 * function serves (proxied to the worker). No collision.
 *
 * EVERYTHING ELSE falls through to QPJ's own static assets (env.ASSETS) — the
 * SPA, its routes, and its own /assets/*. A Pages _worker.js catches all
 * requests, so the function MUST pass through QPJ's own content or the whole
 * portal 404s.
 *
 * The browser only ever talks to QPJ's own origin — the instrument's client
 * uses relative /api/music/* paths and a WS upgrade to /api/music/stream, so
 * same-origin is what makes them work. Identity (the Cloudflare Access cookie,
 * when wired) is carried server-side to the worker's room-key derivation.
 *
 * IMPORTANT: derive the URL from request.url — the Pages Function context does
 * not pass a `url` prop; referencing it crashes the worker (error 1101).
 */

const WORKER = 'https://music-presence.trimtab-signal.workers.dev';

export const onRequest: PagesFunction<{ ASSETS: Fetcher }> = async ({ request, env }) => {
  const url = new URL(request.url);

  // The instrument's SPA entry. Rewrite its /assets/* references to
  // /song-assets/* so they don't collide with QPJ's own /assets/*.
  if (url.pathname === '/song.html') {
    const res = await fetch(new URL('/', WORKER));
    const html = await res.text();
    const rewritten = html.replace(/\/assets\//g, '/song-assets/');
    return new Response(rewritten, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // Allow QPJ to frame it (frame-ancestors 'self' — same origin).
        'X-Frame-Options': 'SAMEORIGIN',
      },
    });
  }

  // The instrument's built bundle, served under /song-assets/*.
  if (url.pathname.startsWith('/song-assets/')) {
    const assetPath = '/assets/' + url.pathname.slice('/song-assets/'.length);
    return fetch(new URL(assetPath, WORKER));
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

  // Everything else is QPJ's own app — serve its static assets (the SPA and
  // its routes). A catch-all _worker.js must pass through the portal's own
  // content or the whole site 404s.
  return env.ASSETS.fetch(request);
};