<!-- P31-HEADER
id: p31_fix_plan_raw_element_controls_20261012_v1.0
type: fix-plan
component: portals/mcp-marketplace
status: resolved
retention: archive-90d
created: 2026-10-12T00:00:00Z
owner: will
-->

# fix-plan: migrate raw form controls to canon (Gate 2 catalog) — RESOLVED

## Symptom

`node scripts/raw-element-gate.mjs` (Gate 2, new) scans
`portals/mcp-marketplace/src` and FAILED: **30 raw control elements**
(`<select>`, `<input>`, `<textarea>`) rendered outside any canon component,
across 14 files. The gate is RED by design — the same raw controls are what
Gate 1 measures rendered at 358–1005px tall (see
`render-gate-baseline-failures.md`).

Gate location: `scripts/raw-element-gate.mjs`. Self-test negative controls
all pass (`--self-test`): raw `<select>` caught, canon `<Select/>`/`<Input/>`/
`<TextArea/>` not flagged, raw elements inside strings/comments not flagged.

## Evidence (scan of 2026-10-12)

```
components/ThemeCharm.tsx:101,105             raw <input>  (muted / warmLight checkboxes)
components/Topbar.tsx:75                      raw <input>  (search)
features/marketplace/DiscoverSurface.tsx:51   raw <input>
features/marketplace/DiscoverSurface.tsx:59,62 raw <select> (category / status filters)
features/marketplace/InspectUrlPanel.tsx:58   raw <input>
features/marketplace/ScopedPlayground.tsx:81  raw <select>
features/playground/PlaygroundSurface.tsx:140,160 raw <select> ("Pick a server" / "Pick a tool" — the tall ones)
features/playground/components/LlmConsole.tsx:124,128,132,138,139,144,145,146,155 raw <input>
features/playground/components/SessionPanel.tsx:94 raw <input>
features/playground/components/ToolForm.tsx:16,26,38,49,60 raw <input>/<select>/<textarea>
features/publish/PublishSurface.tsx:119,123,138,143 raw <input>/<textarea>
features/review/ReviewQueueSurface.tsx:79   raw <input>
```

## Resolution (canon v2 port, 2026-10-12)

Every raw control replaced with a canon v2 component from
`@p31ca/design-core/canon-v2` (or the canon `Checkbox` composition where a
canon v2 control does not exist). The gate's allowlist stayed EMPTY — no
adapter file was needed.

Per file:

- **ThemeCharm.tsx** — two raw checkboxes → canon `Checkbox` (button-based,
  no raw element).
- **Topbar.tsx** — search input → canon `Input type="search"` (44px floor,
  `.topbar-search` width geometry in `src/shell.css`).
- **DiscoverSurface.tsx** — search + 2 filter selects → canon `Input`/`Select`
  inside the `ListingShell` controls row (all `data-p31-control` FIRST
  attribute; aria-labels preserved).
- **InspectUrlPanel.tsx** — URL input → canon `Input type="url"`.
- **ScopedPlayground.tsx** — tool select → canon `Select label="Tool"`.
- **PlaygroundSurface.tsx** — the two 533–1005px selects → canon `Select`
  with `aria-label` (no visible Field label, so the step badges stay the
  single source of the step name — A4-safe) and placeholder options that
  no longer duplicate the step labels ("Choose a server"/"Choose a tool"
  replace the "Pick a server…"/"Pick a tool…" artifacts).
- **LlmConsole.tsx** — three raw radios → one canon `Select` ("Where the
  helper lives"); five settings inputs + the intent input → canon `Input`;
  the empty-tools placeholder yields to a canon `EmptyState`.
- **SessionPanel.tsx** — hidden file input + trigger button → visible canon
  `Input type="file"` (label activates the picker; no ref needed).
- **ToolForm.tsx** — boolean checkbox → canon `Checkbox`; enum → `Select`;
  number/text → `Input`; JSON → `Textarea` (mono styling via token inline
  style). Footer rebuilt as ONE primary button + canon `Menu` for
  "Fill in example values"/"Reset" (one button hierarchy).
- **PublishSurface.tsx** — name → `Input`, description → `Textarea`, address
  → `Input`, manifest file → `Input type="file"`; the surface now composes
  the canon `Wizard` pattern.
- **ReviewQueueSurface.tsx** — email input → canon `Input`.

## Verification

- `node scripts/raw-element-gate.mjs` → **exit 0** against
  `portals/mcp-marketplace/src` (0 raw controls); `--self-test` still proves
  all three negative controls.
- Rendered half: `node scripts/render-gate.mjs` → exit 0 (no control renders
  above the 64px ceiling, any theme, any viewport).