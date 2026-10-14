<!-- P31-HEADER
id: p31_fix_plan_canon_split_keyboard_fallback_20261013_v1.0
type: fix-plan
component: packages/design-core
status: resolved
retention: keep-forever
created: 2026-10-13T00:00:00Z
owner: will
-->

# fix-plan: canon Split keyboard fallback (WCAG 2.5.7 Dragging Movements)

**Discovered by:** agent:subagent:canon-split-keyboard (WCAG 2.5.7 AA
single-pointer-alternative leg)
**Discovered at:** 2026-10-13T00:00:00Z
**Severity:** medium (AA conformance gap — the pointer-capture resize drag had
no collapse parity and no contract tests)

## The gap

`[data-p31="split"]` (packages/design-core/src/compositions/canon-v2/Split.tsx)
resized via pointer capture only for the drag itself. The handle already
carried ArrowLeft/ArrowRight/Home/End, but:

1. **No keyboard collapse toggle** — Enter/Space did nothing; pane B could only
   collapse via the controlled `collapsed` prop.
2. **No single-pointer collapse affordance** — no double-click/dedicated
   action on the handle; WCAG 2.5.7 (Dragging Movements, AA) requires every
   drag gesture to have a single-pointer alternative with parity gestures.
3. **No contract tests** — the keyboard nudge, clamping, collapse, and the
   drag path were untested (`tests/canon-v2.spec.tsx` only SSR-smokes the
   markup).

## The fix — additive, gated on a new `collapsible` prop

No existing selector, rule, or behavior changed. A split without
`collapsible` renders and behaves byte-for-byte as before; the pointer-capture
resize path is untouched.

### 1. Component — `packages/design-core/src/compositions/canon-v2/Split.tsx`

| Change | File:line | Notes |
|---|---|---|
| `collapsible?: boolean` prop | Split.tsx:14 | Opt-in affordances: Enter/Space toggle + double-click collapse |
| `onCollapsedChange?: (collapsed: boolean) => void` | Split.tsx:17 | Optional controlled hook; without it the component owns state |
| Legacy `collapsed` mirror (uncontrolled) | Split.tsx:43–50 | Prop changes sync into internal state; internal toggles do not retrigger |
| `toggleCollapse` | Split.tsx:58–61 | Controlled → calls handler; uncontrolled → flips internal state |
| Enter/Space in `onKeyDown` | Split.tsx:82–85 | `collapsible`-gated; `preventDefault` so Space never scrolls |
| `onDoubleClick` | Split.tsx:87–89 | `collapsible`-gated single-pointer collapse affordance |
| Handle renders while collapsed | Split.tsx:96 | `(!isCollapsed \|\| collapsible)` — the restore affordance survives |
| `data-collapsible` attribute | Split.tsx:99 | On the handle, empty-value attribute form (house style) |
| `aria-valuenow`/`aria-valuetext` | Split.tsx:105–106 | Collapsed → max ratio (80) + `"pane B collapsed"`; expanded → live ratio |
| Pointer-down inert while collapsed | Split.tsx:63–66 | A collapsed handle is never a drag surface |

### 2. CSS — `packages/design-core/src/css/canon-v2.css` (`@layer canon.layout`)

| Selector | File:line | Rule |
|---|---|---|
| `@media (min-width: 48rem)` wrapper | canon-v2.css:321 | Keeps the ≤47.99rem mobile stack identical (handle stays hidden there) |
| `[data-p31="split"][data-collapsed]:has(> [data-p31="split-handle"][data-collapsible])` | canon-v2.css:322–324 | Collapsed grid keeps `minmax(0,1fr) var(--p31-split-handle)` so the restore handle has a track |
| `[data-p31="split"][data-collapsed] > [data-p31="split-handle"][data-collapsible]` | canon-v2.css:325–327 | Overrides the collapsed `display: none` for the collapsible handle only |

Focus affordance: **verified sufficient, no change** —
`[data-p31="split-handle"]:focus-visible` (canon-v2.css:306–309) already draws
`var(--p31-focus-ring)` (2px solid accent, theme-store.ts:92) at
`var(--p31-focus-offset)` (2px, theme-store.ts:93) — a visible keyboard-focus
ring around the 4px handle.

### 3. Contract — `packages/design-core/src/componentDefs.ts`

Split def (componentDefs.ts:971): description, `collapsible` +
`onCollapsedChange` props, accessibility list (Enter/Space toggle, double-click
single-pointer alternative), `collapsible` variant, and an AI-guidance example
added. Tokens unchanged.

## Key interaction spec

| Input | Behavior | ARIA |
|---|---|---|
| Focus + ArrowLeft / ArrowRight | ratio ∓/± 5% step, clamped 20–80% | `aria-valuenow` re-reported in percent |
| Home / End | ratio → 20% / 80% | same |
| Enter / Space (`data-collapsible`) | toggle pane B collapse; handle stays as restore affordance | collapsed: `aria-valuenow=80`, `aria-valuetext="pane B collapsed"` |
| Double-click (`data-collapsible`) | same toggle (single-pointer alternative) | same |
| Pointer drag (unchanged) | capture-resize, `data-dragging`, ratio = clientX fraction | `aria-valuenow` per move |

## Evidence

- `npx tsc --noEmit` in packages/design-core — **green, exit 0**.
- `npx vitest run tests/split.spec.tsx` — **9/9 pass** (keyboard nudge +
  float-step tolerance, Home/End clamp, Enter/Space toggle, double-click
  toggle, inert without `collapsible`, controlled `onCollapsedChange`,
  legacy collapsed-shape, pointer-drag capture smoke, SSR aria contract).
- Full design-core `npx vitest run` — **green for every file this leg owns**:
  `tests/split.spec.tsx` 9/9 and `tests/canon-v2.spec.tsx` 18/18 pass; the
  suite minus the two subprocess-heavy agentic specs passes 12/12 files,
  95/95 tests. The only full-run failures were 5 timeouts in
  `tests/agentic/human-anchor.spec.ts` / `negative-control.spec.ts` — the
  pre-existing load flake already filed as
  `docs/fix-plans/design-core-agentic-spec-subprocess-timeouts.md`; both
  files pass 6/6 in isolation.
- Existing `tests/canon-v2.spec.tsx` Split assertions unchanged and passing —
  the non-collapsible render path is untouched.
- `scripts/frontmatter.mjs --check` + `scripts/fix-plan-scan.mjs`: this
  fix-plan passes both (the scan's two violations are pre-existing open
  wave-8 plans, unrelated to this leg).

## Filed follow-ups (noted, out of this leg's file scope)

- `cli/tokens/components.yml` is generated from `src/componentDefs.ts` by
  `scripts/generate-components-yml.mjs`; the Split prop additions mean the
  generated file is one regeneration behind. That file lives outside the
  design-core compositions/tests/docs scope of this leg — owned by the
  design-core registry leg (`components-yml:gen`). Not gated by root
  `pnpm gate`; the Split def itself is current.