<!-- P31-HEADER
id: p31_canon_v2_adr_20261012_v1.0
type: research
component: packages/design-core
status: live
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

# Canon v2 — ADR-0001: cascade layers, page modes, attribute scoping

Status: accepted (owner-locked design contract). Plan:
`docs/plans/canon-v2-contract.md`. Delivered in `packages/canon` +
`packages/design-core`.

## 1. ADR-0001 — the cascade-layer order

```
@layer legacy, canon.tokens, canon.components, canon.layout, shell, face;
```

Shipped in `packages/canon/src/css/layers.css` (export
`@p31ca/canon/css/layers.css`) and emitted by `packages/canon/scripts/
gen-tokens.mjs` at the top of `dist/tokens.css`. The order is declared once;
the **first** declaration in a document wins, so import layers.css first.

| Layer | Carries | Notes |
|---|---|---|
| `legacy` | Pre-canon CSS quarantined here (`surface-panel`, `setup-input`, `step-row`, …) | Deleted face-by-face as portals port |
| `canon.tokens` | Token custom properties | Its own sublayer so a token override can never out-rank a component rule |
| `canon.components` | Attribute-scoped component CSS (controls, states, patterns) | `canon-v2.css` |
| `canon.layout` | Canon layout primitives (Shell/Page/Stack/Grid/Split) | `canon-v2.css` |
| `shell` | Portal shell-only chrome | Geometry only — canon owns appearance (Law 1) |
| `face` | **RESERVED — faces ship NO CSS** | A stylesheet landing here is a visible violation |

**Unlayered CSS defeats the contract.** Unlayered author CSS beats every
layer, so the canon-lint gate (`docs/plans/canon-v2-contract.md` §Gates) fails
unlayered imports (`@import` without `layer()`). The single sanctioned
exception is the runtime-conditional block in `tokens.css`
(`[data-spoons]`, `[data-dark-mode]`, `[data-theme]`, `[data-portal]`) — it
stays unlayered on purpose so runtime conditions beat every layer.

Interim state (filed: `docs/fix-plans/canon-v2-design-core-legacy-layer-quarantine.md`):
the pre-canon design-core stylesheets (`recipes.css`, `layout.css`,
`chrome.css`, …) are still unlayered. Wrapping them in `@layer legacy` in
place would flip the cascade under every live portal, so the quarantine lands
per-face during the portal port, and the files themselves get wrapped when the
last face ports.

## 2. The four page modes (the 560px select root cause)

`Page` renders `data-p31="page"` + `data-mode`. One mode per page.

| Mode | Behavior | For |
|---|---|---|
| `flow` | Document scroll: width-capped column (`--p31-page-max`), the page owns its rhythm | Every normal route |
| `fill` | Viewport app: fills its container; the `[data-p31-grow]` child is the one scrolling region | Consoles, editors |
| `panel-scroll` | Document page with ONE internal scrolling panel (`[data-p31="page-panel"]`) | The Sandbox split |
| `fit` | Single-screen-fit — alias of `fill` for now | Kiosk surfaces |

**Rule: NO global html/body height-100% flex shell on flow routes.** The
marketplace's 560px select was the two-mode conflation: a fill-mode surface
rendered inside a flow page — the page column set a height on the control's
ancestor, the control's `max-height` fought the viewport, and the select
collapsed. The modes are exclusive; a `fill` page inside
`[data-p31="shell"]` pins the shell to `100dvh` via `:has()` so there is
exactly one scroll owner.

## 3. Attribute scoping — the naming contract

Every new canon style is an attribute selector, never a bare class name.
Bare class names collide across faces — that was the `.surface-panel` bug.

- `[data-p31="shell"]`, `[data-p31="page"]`, `[data-p31="stack"]`,
  `[data-p31-control]`, … — attribute-only form.
- **Performance note:** keep the attribute-only form. Never element-prefix
  (`button[data-p31="tab"]`) — attribute-only selectors stay on the fast path.
- Kind variants use attribute VALUES, not element types:
  `data-p31-control="input" | "select" | "textarea"`.
- The raw-control gate reads `data-p31-control` as the FIRST attribute on the
  element, so the React wrappers render it first.

## 4. Layer wiring — what portals import

```css
/* 1. the layer order — FIRST */
@import '@p31ca/canon/css/layers.css';
/* 2. the tokens (already emits the same order + @layer canon.tokens) */
@import '@p31ca/canon/css/tokens.css';
/* 3. canon v2 component + layout CSS */
@import '@p31ca/design-core/css/canon-v2.css';
```

or the aggregate `@p31ca/design-core/css/index.css` (already imports 1–3 in
order). Components come from `@p31ca/design-core/canon-v2` (also re-exported
from `@p31ca/design-core/compositions`).

## 5. Portal migration steps

1. Swap the portal CSS entry to the three imports above; delete per-portal
   token forks (the mcp-marketplace pattern — `docs/fix-plans/mcp-marketplace-canon-forks.md`).
2. Wrap the portal's own legacy classes in `@layer legacy` (one
   `legacy.css`), keep shell-only geometry in `@layer shell`.
3. Port surfaces face-by-face: legacy classes → `[data-p31=…]` components.
   Delete the legacy class as its surface ports.
4. Raw controls: every `<select>/<input>/<textarea>` becomes
   `Select`/`Input`/`Textarea`/`Field` (the raw-control gate fails otherwise).
5. Page modes: pick ONE mode per route. Fill surfaces stop nesting in flow
   pages.
6. Ship NO face CSS — faces import canon only. `@layer face` stays empty.

## 6. Pattern library vs component library

A component library is not a design system (NN/g maturity model: a library
is one of six dimensions — components; a system also owns foundations,
tokens, patterns, content, governance, and process). The marketplace failure
was a pattern failure: the right primitives composed wrongly.

Canon v2 therefore ships three first-class **patterns** WITH the canon, never
as face forks:

- `ListingShell` — search/filter row + card grid + empty state (Discover).
- `DetailShell` — summary column + focus region + action row (Server).
- `Wizard` — "Step N of M" + one question group per step + back/next (Publish).

Patterns compose primitives; faces compose patterns. A face that re-forks a
pattern is a finding against the canon, not a face innovation.

## 7. Face contract — outline for the next wave

Each face declares (manifest-encoded, validated by the shell vessel):

- `id` — stable face id (doubles as the audit `action_class`).
- `route` — the route the shell mounts it on.
- `nav entry` — label + canon icon for the shell navigation.
- `mode` — the page mode the face runs in (`flow`/`fill`/`panel-scroll`/`fit`).
- `regions` — the named regions the face owns (topbar slots, panels, dialogs).
- `capabilities` + `spoon cost` — what the face can do and what it costs the
  user; gates `CrisisOverlay` / `SpoonDial` behavior.
- `lifecycle events` — mount/focus/action/exit events → the audit ledger with
  the face id as `action_class` (reconciled with the IETF AAT draft:
  `docs/fix-plans/audit-schema-aat-reconciliation.md`).

## 8. Token additions (additive only)

New `p31.*` paths in `BASE` (`packages/canon/src/theming/theme-store.ts`):
`space-4`, `control-h`, `control-h-max`, `control-pad-x`, `control-radius`,
`focus-ring`, `focus-offset`, `gap-xs/sm/md/lg/xl`, `header-height`, `page-max`,
`page-pad-x`, `prose-max`, `form-max`, `page-title-size`,
`shell-sidebar-w`, `grid-min-sm/md/lg`, `split-min-a`, `split-min-b`,
`split-handle`. No pre-existing `p31.*` path or value changed (the
parity/vocabulary gates enforce this). `prose-max` (`65ch`) is CSS-only in
the DTCG export — `ch` is not a portable DTCG dimension unit.
`header-height` is the H1 sticky-topbar contract: `4rem` (64px) — §10.

## 9. Verification

`tsc --noEmit` green in both packages; design-core `vitest run` green
(`tests/canon-v2.spec.tsx` smoke-tests the new family); root
`check-token-vocabulary.mjs` + `check-token-parity.mjs` green; DTCG export
validates under the strict `dtokens` schema; `fix-plan-scan` clean.
`scripts/render-gate.mjs` asserts the rendered contract live: A1–A6 plus
A7 (centered page, `>1280px` viewports) and A8 (scroll-padding parity with
the sticky header) — self-test fixtures prove each has teeth (§13).

## 10. Header-height contract — sticky, not fixed (H1)

`--p31-header-height: 4rem` (64px) is the contract height for sticky topbars.

1. `[data-p31="shell-topbar"]` stays `position: sticky; top: 0` — **NEVER
   `fixed`**. The header occupies flow (Law 1: the shell owns geometry), so
   content below it starts after the bar; nothing underlaps by construction.
2. `html { scroll-padding-top: var(--p31-header-height) }` (in
   `@layer canon.layout`, `canon-v2.css`) — anchor jumps and keyboard focus
   targets land clear of the bar. Scroll-padding MATCHES the token; it is not
   derived from the rendered bar height, so a taller/shorter topbar is a
   shell-geometry finding, not a silent scroll-padding fork.
3. **No overlay-for-atmosphere on app pages** — the bar is a flow element, not
   a veil. `fill`/`fit` surfaces that need full-bleed chrome still route the
   bar through `[data-p31="shell-topbar"]` in the shell grid.
4. The single sanctioned non-attribute selector in `canon-v2.css` is the
   document-root rule above (a root selector, not a class/component selector —
   no collision surface). Render-gate A8 (§13) enforces the rendered parity.

Interim drift (filed: `docs/fix-plans/canon-v2-header-height-legacy-drift.md`):
the pre-canon `design-core/src/css/canon.css` declares
`--p31-header-height: 61px` unlayered, and the marketplace's vendored
`p31-design-core-3.0.1.tgz` predates this rule — both are frozen-bundle
artifacts, resolved on the portal re-vendor leg.

## 11. Centering chain — the page wrapper centers itself

`[data-p31="page"]` (flow + panel-scroll modes) carries
`width: 100%; max-width: var(--p31-page-max); margin-inline: auto;`
(confirmed in `canon-v2.css` — no rule in the canon overrides
`margin-inline` on the page). The rule:

- **The page wrapper centers itself.** Children never set their own centering
  margins to "fix" a page — that is the doubled-margin class of bug.
- `margin-inline: auto` is the mechanism, and it holds in every parent the
  shell can produce: block (`shell-main`), flex, and grid (auto margins absorb
  free track space and win over `justify-self: stretch`). Therefore
  `justify-self: center` is **not** added — it would only apply under a grid
  parent and would mask, not fix, a real centering defect elsewhere.
- Render-gate A7 (§13) asserts the rendered result: on viewports wider than
  `--p31-page-max` (1280px) the page's left/right viewport margins must differ
  by ≤ 8px.

## 12. Control-height semantics — a research correction

`--p31-control-h` (44px) is a **hit-target floor** (WCAG 2.5.5 Target Size,
AAA — 44×44 CSS px), not a visual height. The correct reading:

- rendered height = `max(ControlHeight, contentHeight + 2 × PaddingBlock)`
  — a control may render TALLER than `control-h` when its content demands it
  (`max-height: var(--p31-control-h-max)` caps the runaway case, which is what
  A1's 64px ceiling enforces);
- `textarea` stays `min-height: calc(var(--p31-control-h) * 2)` — two floors
  of target area;
- `input`/`select` use `height: var(--p31-control-h)` as their floor exactly
  because they never grow content-height-wise.

No behavior change — the shipped `canon-v2.css` already conforms. This section
records the semantics so future edits read the token as a floor, not as the
visual height.

## 13. Verification extension — the H1 leg

The H1 leg (header-height + centering contract) added render-gate assertions:

- **A7 centered-page** — when `innerWidth > 1280px`, the `[data-p31="page"]`
  wrapper's left/right viewport margins must differ ≤ 8px.
- **A8 scroll-padding parity** — computed `scroll-padding-top` on `<html>`
  must be ≥ the A3 topbar bottom − 2px. Unset (`auto`) is recorded in gate
  evidence as a note, not a failure — the rule ships with `canon-v2.css` and a
  frozen bundle that predates it cannot be judged for it.

Both have `--self-test` fixtures: the planted bad page (off-center page,
10px scroll-padding under a 60px bar) trips both; the clean page (auto
margins, matching scroll-padding) passes both. Gate results for this leg:
self-test green; live marketplace 30/30 green with A7/A8 evaluated where the
frozen bundle allows (A8 evidence-noted).

## 14. Page-header alignment contract (H2b — POSITIONING item 3)

`[data-p31="page-header"]` gains `data-align="center" | "start"`
(`canon-v2.css`, `@layer canon.layout`):

- `data-align="center"` — `flex-direction: column; align-items: center;
  text-align: center`. The subtitle (`[data-p31="page-header-subtitle"]`)
  caps at `max-width: var(--p31-prose-max)` with `margin-inline: auto`, so
  the centered measure stays inside the prose cap.
- `data-align="start"` — `text-align: left`; the documented default
  (the header block starts at the inline edge).
- **Only the header block centers.** The attribute is scoped to
  `[data-p31="page-header"]` — body prose never centers (design frame:
  "never center body prose"). A surface that wants a centered hero sets the
  attribute on the header; paragraphs below it keep their start alignment
  by construction.

## 15. Explicit grid recipes (H2b — POSITIONING item 4)

`[data-p31="grid"]` gains explicit column recipes (`@layer canon.layout`):

- `data-cols="4"` → `repeat(4, minmax(0, 1fr))`; `data-cols="2"` →
  `repeat(2, …)`; `data-cols="1"` → `minmax(0, 1fr)`. The 2-attribute
  selector outranks the base auto-fill `data-min` recipe — an explicit count
  is a decision, not a floor.
- `data-even` → `grid-auto-rows: 1fr; align-items: stretch`; every grid
  child becomes a flex column at `height: 100%`, and its last (footer-like)
  element pins with `margin-top: auto` — even rows, aligned card footers.
- Responsive collapse: `data-cols="4"` → 2 at ≤900px; any explicit
  `data-cols` → 1 at ≤560px.

## 16. Card + link hover contract (H2b — POSITIONING item 5)

`canon-v2.css`, `@layer canon.components`:

- **Card links/CTAs never underline** —
  `[data-p31="card"] a, [data-p31="card"] [data-p31="card-cta"] {
  text-decoration: none; }`.
- **Card hover** — `translateY(-2px)` + `border-color` accent mix
  (`color-mix(in oklch, var(--p31-accent) 45%, var(--p31-glass-border))`),
  transitioned on `transform`/`border-color` with
  `var(--p31-duration-fast)`/`var(--p31-easing-standard)`.
- **CTA in a hovered card** — `color: var(--p31-accent-hover)`; the arrow
  child (`[data-p31="card-cta-arrow"]`) shifts `translateX(2px)`.
  `:focus-visible` on the CTA gets the same treatment (keyboard parity).
- **Standalone links** — `[data-p31="link-standalone"]`: no underline;
  `::after` underline-draw (1px `currentColor`, `scaleX` 0→1,
  `transform-origin: left`) on hover/focus-visible.
- **Prose links stay underlined** (WCAG 1.4.1) — `text-decoration:
  underline` is owned by prose styles and is NOT part of this contract.
  Boundary note: `[data-p31="card"] a` de-underlines chrome anchors inside
  cards; a face that puts body copy inside a card keeps prose underlines via
  its prose styles (the contract owns card chrome, not body copy).
- **prefers-reduced-motion** — transitions off; feedback is instantaneous,
  never animated.
- **No bold/scale/rotation/background on text hover** — the text never
  moves; only the card lifts, the arrow shifts, the underline slides.

Token note (filed:
`docs/fix-plans/canon-v2-align-cols-hover-contracts.md`): the contract
consumes `--p31-accent-hover` from the canon CSS export
(`@p31ca/canon/css/quantum.css`); that token is CSS-only today (absent from
`tokens.dtc.json` — the parity gate reports it as a non-portable CSS-only
token). Promoting it into the DTCG export is a canon-token leg, owned by the
canon package (out of scope for this design-core leg).

## 17. Split keyboard fallback — the 2.5.7 contract (WCAG AA)

WCAG 2.5.7 (Dragging Movements) requires every drag gesture to have a
single-pointer alternative. The split-handle drag
(`[data-p31="split-handle"]`, pointer-capture resize) therefore carries its
keyboard fallback as a hard contract, not a surface option:

- **ArrowLeft/ArrowRight** — ratio ± the 5% `STEP`, clamped to the
  `--p31-split-min-a`/`--p31-split-min-b` bounds (20–80%); `aria-valuenow`
  re-reported in percent on every change.
- **Home/End** — snap to min/max.
- **Enter/Space** — toggle collapse, **gated on `data-collapsible`** (the
  `collapsible` prop). The toggle is opt-in: a split without `collapsible`
  behaves exactly as before.
- **Double-click** on the handle (also `data-collapsible`-gated) — the
  pointer-side collapse affordance; Enter/Space is its keyboard parity
  gesture.
- **The handle survives collapse** — when `collapsible`, the handle stays
  rendered while collapsed (above the 48rem mobile stack threshold) as the
  restore affordance; `aria-valuenow` reports the max ratio and
  `aria-valuetext="pane B collapsed"` names the state. A non-collapsible
  collapsed split is unchanged: handle + pane B leave the grid. A collapsed
  handle is never a drag surface (pointer-down is inert) — only Enter/Space
  or double-click.
- **Keyboard focus is visible** — `[data-p31="split-handle"]:focus-visible`
  draws `var(--p31-focus-ring)` (2px solid accent) at
  `var(--p31-focus-offset)` (2px). Verified sufficient; no CSS change
  needed for the affordance.
- **State ownership** — `onCollapsedChange` is the optional controlled hook;
  without it the component owns collapse state internally and still mirrors
  the legacy controlled `collapsed` prop (prop changes sync, internal
  toggles do not).

The contract is test-enforced in
`packages/design-core/tests/split.spec.tsx` (keyboard nudge/clamp/toggle,
double-click, controlled handler, pointer-drag parity smoke). Filed:
`docs/fix-plans/canon-split-keyboard-fallback.md`.