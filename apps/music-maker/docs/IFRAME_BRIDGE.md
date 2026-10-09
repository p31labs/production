# The music maker in QPJ's sandbox — iframe bridge + render hardening

The instrument is QPJ's "street-song": a full-screen SPA served same-origin at
`/song.html` (proxied by a Pages Function to this app's deployed worker) and
framed by QPJ inside `sandbox="allow-scripts allow-same-origin"`.

## Why the sandbox stays

The sandbox is **crash isolation, not the collaboration boundary**. The
instrument gets its own JS heap, WebGL context, and audio context inside the
frame, so one device's instrument crash (a shader failure, a context loss, an
effect throw) never takes down the parent shell or the other devices. That is
the whole value of framing it. The `allow-scripts allow-same-origin` pair is a
known escape-risk shape (MDN warns about it) — acceptable here because the
framed content is QPJ's own first-party code, not an untrusted third party.

## The white-screen bug it fixed

Both the WebGL scene and the 2D starfield sized themselves **once, at script
run time** (`canvas.clientWidth || window.innerWidth`). In a just-mounted
iframe the canvas is 0×0 (the frame hasn't laid out), so:

- the WebGL drawing buffer installed at 0×0, and
- `window` `resize` only fires on *changes* — the iframe size never changes
  after it settles, so nothing ever re-sized the buffer. Blank forever.

Fixes (see `src/scene/SpatialScene.tsx`, `src/components/Starfield.tsx`):

- **ResizeObserver** on the canvas host rebuilds/re-sizes the moment the iframe
  lays out.
- A **per-frame size check** in `drawFrame` (SpatialScene) and in `draw`
  (Starfield) — the frame never draws into a 0-size buffer.
- `renderer.setSize(w, h, false)` — `updateStyle=false` so CSS owns the canvas
  layout (100%×100%) and only the drawing buffer tracks the size.
- **`webglcontextlost` / `webglcontextrestored`** handlers: halt the loop on
  loss, re-sync size on restore.
- Reduced motion (one static frame) **defers the draw until the canvas has a
  real size** instead of freezing the 0×0 first paint.
- `html, body, #root { background: var(--p31-bg, …) }` — the never-white floor,
  so a failed/absent WebGL is the dark sky, not the browser's white.
- An **error boundary** (`src/components/ErrorBoundary.tsx`) renders a warm
  recoverable message instead of a white frame (the parent shell can't see the
  iframe's console).

## The bridge (`src/lib/iframeBridge.ts`)

Parent → instrument: identity, the shell's **resolved token values** (not theme
names — QPJ's themes are inline `setProperty`, they don't cross the frame), and
the online roster. Instrument → parent: `p31:ready`, then activity
(trigger/place/clear) with the live zone count. The DO room stays the source of
truth for the composition — the bridge is a live hint, never authoritative
state. Messages are `postMessage(…, '*')`, so they keep working even under an
opaque origin. The module is mirrored in QPJ
(`production/portals/qpj/src/lib/iframeBridge.ts`); both are unit-tested and
must stay in sync.

Standalone (the worker URL, no shell) the bridge is a silent no-op —
`window.parent === window`.

## The cross-device trigger loop

A local tap calls `session.triggerZone(id)` (NOT `localTrigger`) — the glow and
sound happen locally AND the ephemeral trigger is broadcast over the live
transport so the family's other devices play too. Without the broadcast half,
"hear the family play along" only worked one way.

Known follow-up: the remote author's pickle name does not yet cross the DO
boundary — the worker's `sanitizeEphemeral` strips ephemeral frames to
`zone + origin`. Until the protocol carries `author` through, the parent's live
line reads "someone played …" for remote play. The change is small (add
`author?: string` to the ephemeral frame shape on the client AND the worker's
passthrough sanitizer) and is deliberately deferred to avoid touching the
production DO transport in the same pass as the render fix.