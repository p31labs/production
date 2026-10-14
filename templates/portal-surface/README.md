<!-- P31-HEADER
id: p31_template_portal_surface_20261013_v1.0
type: template
component: templates/portal-surface
status: live
retention: keep-forever
created: 2026-10-13T00:00:00Z
owner: will
-->

# portal-surface — scaffold notes for a canon-wired React/Vite portal

BLUEPRINT ONLY — not a runnable package. These are the standing notes for
adding or porting a surface in the React/Vite world (`portals/*`, `shell/`),
per canon-v2 §5 and the mcp-marketplace port pattern.

## 1. CSS wiring (canon-v2 §4 — the three imports, in order)

```css
/* main.tsx or the portal's index.css — order is the contract */
@import '@p31ca/canon/css/layers.css';   /* 1. layer order FIRST */
@import '@p31ca/canon/css/tokens.css';   /* 2. tokens (emits the same order) */
@import '@p31ca/design-core/css/canon-v2.css'; /* 3. components + layout */
```

Rules:
- The portal's own legacy classes live in ONE `legacy.css` wrapped in
  `@layer legacy`; shell-only geometry in `@layer shell` (Law 1: shell =
  geometry only, never color/typography).
- `@layer face` stays EMPTY — a face importing CSS lands in a violation.
- Portal-only token names get ONE indirection alias file (the
  `portals/mcp-marketplace/src/tokens.css` pattern — aliases to canon
  names, zero invented values). That file is the canonical-source-audit
  R1-safe adapter; copy it, don't fork values.

## 2. Surface registration (the shell vessel contract)

A face declares (canon-v2 §7, manifest-encoded):

```ts
export const surfaceManifest = {
  id: 'my-surface',            // stable id = audit action_class
  route: '/my-surface',        // the route the shell mounts it on
  navEntry: { label: 'My Surface', icon: 'canon-icon-name' },
  mode: 'flow',                // flow | fill | panel-scroll | fit — ONE per route
  regions: ['topbar', 'main'], // named regions the face owns
  capabilities: ['read'],      // what it can do
  spoonCost: 2,                // gates CrisisOverlay / SpoonDial behavior
  lifecycle: ['mount', 'focus', 'action', 'exit'], // → audit ledger
};
```

Mechanical checks: `mode` must be one of the four enum values; `route`
must not collide with another face; `spoonCost` 0–5.

## 3. mcpTools gate chain

A portal surface that calls tools routes them through the gate chain —
identity → capability → spoon cost → audit:

```
mcpTools.getState()            // what the registry exposes (list only, never call directly)
  → capabilityToken.resolve()  // does this identity hold the capability?
  → useSpoonDial.consume(cost) // spoon budget (0-5); 0 refuses the call
  → mcpWire.dispatch()         // the ONLY call path
  → sessionLog.append(action_class = surfaceManifest.id)
```

Any direct `fetch`/tool call outside `mcpWire.dispatch` is a finding
(audit ledger misses the event). The design portal's `src/lib/mcpTools.ts`
and the marketplace's `src/lib/{capabilityToken,mcpWire,sessionLog}.ts`
are the reference implementations.

## 4. Port order per surface (canon-v2 §5 steps 3–6)

1. Swap raw `<select>/<input>/<textarea>` → canon `Select`/`Input`/
   `Textarea`/`Field` (the raw-control gate fails otherwise; React wrappers
   render `data-p31-control` as the FIRST attribute).
2. Replace the face's legacy layout classes with `[data-p31="page"]` +
   one mode; fill surfaces stop nesting inside flow pages (the 560px
   select root cause).
3. Replace grids with `data-p31="grid" data-cols data-even`; headers with
   the `[data-p31="page-header"]` chain (PAGE-CONTRACTS.md applies to
   portal pages too).
4. Delete the face's legacy classes as their surfaces port — never
   before (no-delete rule + cascade safety, rollback condition 3).
5. Verify: `canon-source-audit.mjs --target portals/<name>` → 0 forks;
   render-gate A1–A8 green; face ships NO CSS.

## 5. Frozen-bundle re-vendor leg

`portals/mcp-marketplace/vendor/p31-design-core-3.0.1.tgz` and the legacy
`canon.css` 61px header are frozen artifacts (filed:
`canon-v2-header-height-legacy-drift.md`). A portal still consuming a
vendor tgz re-vendors AFTER Track A's Phase 1 decision set — never patch
the tgz in place. Until then, its A7/A8 render-gate results are
evidence-noted, not failures.