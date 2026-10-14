<!-- P31-HEADER
id: p31_fix_plan_sw_cache_pinned_stale_deploys_20261012_v1.0
type: fix-plan
component: portals/mcp-marketplace
status: resolved
retention: archive-90d
created: 2026-10-12T00:00:00Z
owner: will
-->

# fix: service worker pinned stale index.html across deploys (broken assets)

## Symptom

After a portal deploy, browsers served the OLD `index.html` (via the service
worker's `marketplace-v1` cache, which precached `/` at install and answered
cache-first). The stale HTML referenced hashed assets that Cloudflare Pages
had purged, so every asset request fell through to the SPA fallback and
returned `text/html` → `Refused to apply style` / `Failed to load module
script` MIME errors. The deploy itself was healthy (live index referenced
existing assets).

## Root cause

`public/sw.js` cache-first strategy + a constant cache name: the precached
`/` was never revalidated and the cache name never bumped, so no deploy could
ever reach a returning visitor.

## Fix (2026-10-12)

Rewrote `public/sw.js` (cache `marketplace-v2`):

- No precache of `/` (HTML is network-first).
- Navigations/HTML: network-first with `/shell` offline fallback — new
  deploys apply immediately.
- Hashed assets: stale-while-revalidate.
- API: network-first with offline fallback (unchanged).
- `activate` deletes all non-current caches — existing clients self-heal
  (old `marketplace-v1`, stale index, and orphaned hashed assets are purged).

## Verification

- `sw.js` serves `marketplace-v2` with `Cache-Control: no-cache`.
- Live assets all 200 with correct MIME types; production root 200.
- One hard refresh (or two reloads) migrates a client onto the new SW;
  `skipWaiting` + `clients.claim` take control without a full close.