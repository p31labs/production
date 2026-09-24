# 28 — The street-song iframe (sandbox + bridge)

How QPJ frames the spatial instrument (`/song.html`, proxied to the
music-presence worker by `functions/[[path]].ts`) and collaborates with it.

## The sandbox is crash isolation, not a collaboration boundary

`sandbox="allow-scripts allow-same-origin"` gives the instrument its own JS
heap, WebGL context, and audio context inside the frame. One device's instrument
crash — a shader failure, a context loss, an effect throw — never takes down the
parent shell or the other devices. That isolation is the reason to frame it;
remove the sandbox and you lose it. The `allow-scripts allow-same-origin` pair
is a known escape-risk shape (MDN), acceptable because the framed content is our
own first-party code. Collaboration happens over the shared DO room + the
bridge, not through the sandbox.

## The iframe (SongPage.tsx)

- `sandbox="allow-scripts allow-same-origin"` — never removed.
- **Eager** (`loading="lazy"` removed). `requestAnimationFrame` is paused in
  hidden/lazy frames, which froze the instrument's canvas on first load.
- `referrerPolicy="no-referrer"`, `src="/song.html"`, `onLoad` pings the bridge.

## The bridge (`src/lib/iframeBridge.ts` + `src/hooks/useSongBridge.ts`)

Parent pushes down: identity (pickled name + passport id), the shell's
**resolved `--p31-*` token values** (read from `getComputedStyle` — QPJ's themes
are inline `setProperty`, they don't cross the frame), and the online roster
(from `presence`). The instrument pushes up: `p31:ready`, then activity
(trigger/place/clear with the live zone count) which drives the `song__live`
line under the song header.

The DO room remains the source of truth for the composition — the bridge is a
live hint. It is never persisted, never trusted for state, and messages carry a
`'*'` target so they work even under an opaque origin. The instrument mirrors
this protocol in `apps/music-maker/src/lib/iframeBridge.ts`; keep them in sync.

### Mesh ID note

The PeerJS mesh ID is composed from lowercase alphanumerics + hyphens
(`qpj-dillpickle-garden-lane`). PeerJS's valid ID pattern is
`/^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/` — colons AND dots are rejected. The
earlier `qpj:dillpickle:garden.lane` and `qpj.dillpickle.garden.lane` shapes
both failed, so the mesh never actually connected (it fell back to simulated
presence with a console error). The store composes and parses this format in
`useQpjStore.ts` (`initMesh`) — keep both sides of the format in sync.

## Verifying

`SONG_E2E_URL=https://qpj.p31ca.org pnpm exec playwright test e2e/song-render.spec.ts`

- Frame contract: sandbox kept, eager load, `song__live` visible.
- Render contract: the WebGL drawing buffer and the 2D starfield canvas reach
  real, non-blank size (the exact 0×0-forever regression the ResizeObserver
  fix addresses).

The spec self-skips without `SONG_E2E_URL`: the local vite dev server's SPA
fallback serves QPJ's own `index.html` into the frame — a same-origin
self-embed that crashes the shared renderer — so it cannot host the instrument.
Run it against the deployed origin or `wrangler pages dev`.

## Deploy order

1. Deploy the instrument build (music-maker → music-presence worker) — the
   render fixes live there.
2. Deploy QPJ (drop `loading="lazy"`, bridge, `song__live`).
3. Run the e2e above against the deployed origin — it should now pass.