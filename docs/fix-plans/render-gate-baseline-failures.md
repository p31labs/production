<!-- P31-HEADER
id: p31_fix_plan_render_gate_baseline_20261012_v1.0
type: fix-plan
component: scripts
status: resolved
retention: archive-90d
created: 2026-10-12T00:00:00Z
owner: will
-->

# fix-plan: render-gate baseline failures (the gate has teeth — proof) — RESOLVED

## Symptom

The new rendered-output gate (`scripts/render-gate.mjs`) was run against
TODAY's live marketplace **before any fix landed**, as its mandated negative
control. It FAILED — 42 rendered violations across the five routes, three
viewports, two themes. This file is the proof the gate catches the real bug:
it is not a sensor that rubber-stamps a broken layout.

## Evidence (captured 2026-10-12, gate run vs https://p31-portal-mcp-marketplace.pages.dev)

Transcript: `/tmp/opencode/render-gate/baseline-transcript.txt`
Evidence JSON: `/tmp/opencode/render-gate/results.json`
Screenshots (30 PNGs, route × viewport × theme): `/tmp/opencode/render-gate/*.png`

Failures by assertion kind:

| kind | count | what it caught |
|---|---|---|
| control-ceiling (>64px) | 36 | the tall controls — see below |
| card-width (<240px in grid) | 6 | home `surface-card` 229.3px wide @ 768×1024 |
| overflow / topbar-clip / doubled-text | 0 | did not trip today (see notes) |

The tall controls (heights scale with viewport height — flex-stretch/height:100%
class of bug, the "560px select"):

| route | control | 375×812 | 768×1024 | 1280×800 |
|---|---|---|---|---|
| #/discover | input "input.setup-input" | 885.6px | 546.3px | 358.1px |
| #/discover | select "Filter by category" | 885.6px | 546.4px | 358.1px |
| #/discover | select "Filter by status" | 885.6px | 546.4px | 358.1px |
| #/playground | select "Pick a server" | 1005.2px | 659.7px | **533.7px** |
| #/playground | select "Pick a tool" | 1005.2px | 659.7px | 533.7px |
| #/publish | textarea "Server description" | 70px | 70px | 70px |

Same failures in BOTH themes (ocean default + aurora dark) — the bug is
theme-independent (geometry, not a value swap), so the theme pass fails too.

Clean matrix cells: `#/home` (all viewports except the 768 card-width hit),
`#/server/p31-crypto` (all viewports × themes — zero violations), `#/publish`
only the textarea. Gate exit code 1.

## Why the gate is correct (not a false alarm)

- `--self-test` proves all five assertion classes trip on planted fixtures
  and a clean fixture passes (`node scripts/render-gate.mjs --self-test`).
- The control-ceiling numbers are the exact marketplace bug the gate exists
  for: raw controls grown by portal CSS to fill the surface column.
- Doubled-text/overflow/topbar-clip assertions are armed and self-test-proven
  but did not trip on today's routes (the doubled "helper isn't connected"
  string lives in the LLM-console panel, which is collapsed by default).

## Resolution (canon v2 port, 2026-10-12 — all 42 violations → 0)

The marketplace ported onto canon v2 (ADR-0001). Per fix:

1. **Controls** — all 30 raw `<select>/<input>/<textarea>` became canon
   `Select`/`Input`/`Textarea` (`data-p31-control`, 44px floor, 64px ceiling,
   `flex: 0 0 auto`, `align-self: start`). See
   `raw-element-controls-canon-migration.md` (resolved).
2. **Layers** — portal sheets quarantined: `workspace.css`/`marketplace.css`
   → `layer(legacy)`; canon layout/component rules sit in
   `canon.layout`/`canon.components` above them, so `.surface-panel {
   height: 100% }` can no longer stretch a control. See
   `canon-css-layer-adoption.md` (resolved). Textareas are pinned ≤64px by
   the shell-owned geometry cap (`src/shell.css`).
3. **Cards** — Home renders its three cards as direct children of a canon
   `Grid min="sm"` (240px floor) — the 229.3px surface-cards are gone.
4. **A3 anchor** — the Topbar (header[role=banner]) renders BEFORE the canon
   `Shell` in the App tree. The gate's anchor selector
   (`header[role="banner"], .topbar, [data-p31]`) resolves to the first
   match in document order; a `[data-p31="shell"]` wrapper before the header
   would measure the whole page as the "topbar" and false-trip A3. Documented
   in `src/App.tsx`.
5. **A4** — playground selects carry `aria-label`s (attributes, not text
   nodes) and their placeholder options no longer duplicate the step labels
   (the "Pick a server" / "Pick a server…" pair is retired).

## Verification

- `node scripts/render-gate.mjs --url http://localhost:5199` (local preview)
  → **exit 0** — 30/30 route×viewport×theme cells clean, both themes.
- Post-deploy run against `https://p31-portal-mcp-marketplace.pages.dev`
  → exit 0 (evidence `results.json` regenerated under `/tmp/opencode/render-gate`).
- `--self-test` still proves all five assertion classes.

## Coverage gap (filed separately)

`workspace.p31ca.org` reports `topbar-missing` on the informational pass
(no `[data-p31]`/`.topbar`/`header[role=banner]` in its client-rendered
shell). See `docs/fix-plans/render-gate-workspace-anchor-coverage.md`.
`design.p31ca.org` passes all assertions at 1280×800 under both themes.