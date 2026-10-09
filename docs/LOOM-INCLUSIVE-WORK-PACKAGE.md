# P31 Loom — Inclusive Design Work Package

**For:** DeepSeek V4 Pro coding agent
**Bar:** A 12-year-old, a 72-year-old, a tired parent with ADHD, and a dyslexic
grandparent all find the AHA moment without being taught.
**Status:** Ready to execute. Phase A is the substrate; B–D depend on it; E proves it.

---

## 0. Ground truth (verified this session — do not rebuild what exists)

The repo already has more inclusive infrastructure than the brief assumes. The
gap is **consumption**, not schema.

| What exists | Where | Verdict |
|---|---|---|
| Full presentation axis schema: `letterSpacing`, `lineSpacing`, `motion` (`full/reduced/none`), `density` (`compact/comfortable/spacious`), `colorSaturation` (`normal/muted`), `literalLabels` (boolean) | `packages/canon/src/loom/profiles.ts:30-37` | **Complete. Do not touch.** |
| Per-human consent flags `shareWithAgents.tier` / `.presentation` | `profiles.ts:41-44` | Complete. Agents must respect them. |
| Profile → CSS overrides | `apps/loom/src/lib/profile.ts:29-39` (`presentationOverrides`) | **Partial** — maps `letterSpacing`, `lineSpacing`, `density` only. Ignores `motion`, `colorSaturation`, `literalLabels`. |
| Accessibility floor tokens | `apps/loom/src/index.css:13-17` (`--loom-letter-spacing`, `--loom-line-height`, `--loom-density`) | Declared, but **`--loom-density` has zero consumers** anywhere in `index.css`. |
| `prefers-reduced-motion` collapse | `index.css:23-29` | Present and correct (global). |
| No-autoplay Jitterbug | `apps/loom/src/components/JitterbugScene.tsx:443-444,838-849` (`playing=false`, explicit Play button, rAF dropped under reduced motion) | **Already enforced.** Needs an e2e assertion, not code. |
| Plain-language mediation for beginners | `packages/canon-mcp/src/loom-tools.ts:124-145` (`mediate()` → deterministic `mediatedSummary`); registered as `loom_mediate` in `server.ts:497-514` | Exists **server-side only**; `ProposalReviewPanel` never consumes it. |
| Tier progressive disclosure | `apps/loom/src/lib/surface.ts` (`resolveSurface`) | Complete (beginner→digest, intermediate→overlay, advanced→scrubber). |
| Pronoun rendering, "human + agent, one log" | `apps/loom/src/App.tsx:173-184` | Correct; pronouns default to absent (never assume). |
| No gender collection | `profiles.ts` — `HumanProfile` has `displayName`, `pronouns`, no gender field | **Correct.** Do not add one. |
| Design Gate checklist (hex, tokens, typecheck, test) | `AGENTS.md` → "Design Gate" | Manual checklist today; Phase E turns it into an executable script. |

### The three "axes" — corrected naming

Use the **canonical enum values already in `profiles.ts`**. Do not invent
`calm/standard/dense` or `plain/technical`:

- **Density:** `compact` | `comfortable` | `spacious`
- **Motion:** `full` | `reduced` | `none`
- **Language:** `literalLabels: boolean` (true = plain, false/absent = technical)
- **Color saturation:** `normal` | `muted` (secondary axis; folded into Phase A)

---

## Phase A — Wire the floor

**Why first:** These are the substrate. Every later phase keys off the
`data-*` surface produced here.

### A1 — Map the missing axes into `presentationOverrides`

**File:** `apps/loom/src/lib/profile.ts`

Extend `presentationOverrides` (currently lines 29-39) to also emit:

| Profile field | CSS variable | Values |
|---|---|---|
| `presentation.motion` | `--loom-motion` | `full` / `reduced` / `none` |
| `presentation.colorSaturation` | `--loom-color-saturation` | `normal` / `muted` |
| `presentation.literalLabels` | `--loom-literal-labels` | `1` / `0` |

`density` stays as-is (`spacious`/`compact` → `--loom-density`); add the
neutral `comfortable` value explicitly for completeness. `letterSpacing` /
`lineSpacing` unchanged.

**Acceptance:** `presentationOverrides()` returns all six variables for a
fully-populated profile; `{}` for null/empty. Unit-testable in
`apps/loom/src/lib/profile.test.ts` (add if absent).

### A2 — Surface the axes on the shell

**File:** `apps/loom/src/App.tsx` (the `.loom-shell` element, line 167)

Render, alongside the existing `data-tier`:

```
data-density={…} data-motion={…} data-saturation={…} data-literal-labels={…}
```

Derive from `useProfile()` (`overrides` + `profile`). Defaults when profile
absent: `comfortable`, `full`, `normal`, `0`.

**Acceptance:** DOM has all four attributes; changing `?tier=`/profile reflows them.

### A3 — Declare + consume the tokens in CSS

**File:** `apps/loom/src/index.css`

1. Declare `--loom-motion`, `--loom-color-saturation`,
   `--loom-literal-labels` in `:root` (line 13-17 block), with the floor as
   default.
2. **Consume `--loom-density`** (currently dead) in at least these three places:
   - `.loom-shell` grid column: `spacious` → `1fr 360px`, `comfortable` →
     `1fr 320px`, `compact` → `1fr 280px`.
   - Graph edge opacity via `.loom-edge` (see A3 note below — edges are styled
     inline in `App.tsx:115-118`; move the dim base to a CSS var).
   - Node label gating threshold (see Phase P2/registry-declutter work already
     scoped separately).
3. **Consume `--loom-motion`** for all `transition-duration`/`animation`
   properties (a top-level mapping to `0ms`/`100ms`/`200ms` equivalents).

**Acceptance:** `--loom-density` has ≥3 consumers; `--loom-motion` drives the
transition durations; visual review at all three density tiers shows a
measurable difference.

### A4 — Copy layer for `literalLabels`

**Files:** `apps/loom/src/lib/copy.ts` (new); consumers in `Instrument.tsx`,
`JitterbugScene.tsx`, `EventOverlay.tsx`, `ProposalReviewPanel.tsx`.

A single `copy(key, literal: boolean): string` map. Example keys:

| key | technical (false) | plain (true) |
|---|---|---|
| `readout.entropy` | `ENTROPY` | `Chaos` |
| `readout.edge` | `EDGE` | `Connections` |
| `readout.white` | `WHITE` | `Open space` |
| `jb.phase.isostatic` | `Six vertices remain. The framework is isostatic — just.` | `Six points left. The shape is holding.` |
| `panel.empty` | `No events yet` | `Nothing here yet. That's fine.` |
| `panel.empty.explain` | `Events append here.` | `This is where the log appears — your actions and the agent's.` |

`literalLabels` true selects the plain column. The **technical column is the
current strings** — this is a migration, not a rewrite.

**Acceptance:** `copy()` is pure and unit-tested; every readout/narration
string flows through it; no string is hardcoded in a component.

### A5 — Motion degradation

**Files:** `apps/loom/src/index.css`, `apps/loom/src/components/JitterbugScene.tsx`

`--loom-motion`:
- `full`: current behavior (glow pulse, orb ease, 200ms transitions).
- `reduced`: halved durations, static caption instead of glow pulse.
- `none`: 0ms transitions; Jitterbug still renders but does not auto-advance
  (already true); agent cursor teleports with a **longer** trail.

**Acceptance:** the existing `@media (prefers-reduced-motion: reduce)` block
and `--loom-motion=none` produce equivalent stillness; no layout shift.

**Gate for Phase A:** `pnpm --filter @p31ca/canon test:loom` **and**
`pnpm --filter @p31ca/loom typecheck` **and** `pnpm --filter @p31ca/loom test`.
All six variables emitted; density has ≥3 consumers; copy map complete for
every readout + narration string.

---

## Phase B — The legible canvas

### B1 — Typographic floor + hierarchy

**File:** `apps/loom/src/index.css`

- Raise every interactive/readout font below `0.8rem` (≈12.8px) to ≥ `0.8rem`.
  Affected: `.jb-quote` (1.35rem ok), `.jb-attrib` (0.68), `.jb-readouts` (0.72),
  `.jb-row`/`.jb-key`/`.jb-val`, `.jb-btns button` (0.68), `.loom-node` (10px),
  `.loom-kind` (11px), `.ev-item` (12px ok but confirm), `.digest-*`.
- Enforce the three-level hierarchy:

| Role | Size | Weight | Font | Contrast |
|---|---|---|---|---|
| Values (numbers that change) | 0.85rem | 500 | mono | high |
| Labels (static context) | 0.72rem | 400 | sans | medium |
| Context | 0.65rem | 400 | sans | low |

**Acceptance:** no `font-size` below 12px on text that must be read;
values/labels/context visually distinct.

### B2 — Touch targets

**File:** `apps/loom/src/index.css`

Every interactive element gets a **minimum 24×24 CSS px** hit area (WCAG 2.2
SC 2.5.8 AA); **44×44 preferred** for primary actions (SC 2.5.5 AAA). Use
`min-height`/`min-width` on the target container (WCAG technique C44).

Affected: `.loom-btn` (6×12), `.jb-btns button` (8×16), `.ev-follow` (11px),
`.loom-mode`, `.loom-more`, `.ts-back`, node click areas, scrubber thumb.

**Acceptance:** the Phase E static gate flags zero sub-24px interactive elements.

### B3 — Color independence

**Files:** `apps/loom/src/index.css`, `apps/loom/src/components/EventOverlay.tsx`

`.ev-item--human` and `.ev-item--agent` differ only by border-left hue — add a
glyph or text tag (`you` / `agent`) so the distinction survives monochrome.
Readouts already use number + bar + color (correct; keep). `colorSaturation:
muted` should reduce chroma without collapsing the value/label contrast.

**Acceptance:** monochrome filter preserves all distinctions.

### B4 — Designed empty state

**Files:** `apps/loom/src/components/EventOverlay.tsx`, `index.css`

Replace `no events yet` with the `panel.empty` + `panel.empty.explain` pair
(plain or technical via `copy()`), so a first-time user is told what the panel
is for.

**Gate for Phase B:** visual review at three density tiers; all read text
≥12px; all targets ≥24px; empty state rendered through `copy()`.

---

## Phase C — Predictable shell + delight when chosen

### C1 — Immutable shell

**File:** `apps/loom/src/App.tsx` + `index.css`

Topbar, event-log rail, and control deck stay in the same position across all
three modes; only the central `.loom-canvas` content changes.

**Acceptance:** e2e asserts the rail/topbar bounding boxes are invariant
across `canvas` → `instrument` → `jitterbug` mode switches.

### C2 — Visible exits

**Files:** `apps/loom/src/App.tsx`, `apps/loom/src/components/Instrument.tsx`

Every panel/overlay gets a **labeled** "return to field" affordance (a button
with text, not a shortcut, not click-empty-space). TraceScale already has a
back affordance; confirm the review panel and digest have one.

### C3 — No-autoplay (assert, don't rewrite)

**File:** `apps/loom/tests/e2e/*.spec.ts`

Add a Playwright test: load Jitterbug, assert the scene is static (no
`requestAnimationFrame` progression / phase text unchanged) until Play is clicked.

### C4 — Delight gated by motion preference

**Files:** `JitterbugScene.tsx`, `index.css`

Glow pulse, orb easing, cursor trail only under `motion=full`; reduced →
static caption; none → teleport + longer trail.

**Gate for Phase C:** no-autoplay e2e green; shell-position invariance e2e green.

---

## Phase D — Dignity pass (audit, mostly already correct)

### D1 — Pronouns

**File:** `apps/loom/src/App.tsx` (chip, lines 173-178)

Pronouns already render and default to absent (never assume he/she). Confirm no
string assumes the human is male or the agent is female.

### D2 — No gender collection

**File:** `packages/canon/src/loom/profiles.ts`

Confirmed: no gender field. **Do not add one.** If a future feature needs it,
apply: open text box (most inclusive), avoid "Other"/"Something Else", multiple
terms (`Woman / Female (Cis or Trans)`), `Prefer not to answer`, collect
cis/trans status only when actually needed. (ACM "Revisiting Gendered Web
Forms".)

### D3 — Plain-language proposal review

**File:** `apps/loom/src/components/ProposalReviewPanel.tsx`

Add a toggle that shows `mediate()`'s deterministic `mediatedSummary` instead of
the technical body. This reuses the server-side capability; the frontend only
consumes it (and only for beginners who consented `shareWithAgents.tier`).

**Gate for Phase D:** no gender field exists; chip renders pronouns with
absent-default; review panel has a plain-language path.

---

## Phase E — Proof (the inclusive gate)

### E1 — Static design-gate script

**File:** `packages/canon/scripts/check-inclusive.mjs` (new); wire into
`package.json` as `"verify:inclusive"`.

Scans `apps/loom/src` for: font-size < 12px; hardcoded hex in production code;
interactive elements with padding/size < 24px; missing `data-density` /
`data-motion` on `.loom-shell`.

**Honesty bound:** this grades mechanics, not cognition. It cannot verify plain
language is *actually* plain — that is human review. State this in the script
header.

### E2 — axe-core pass

**File:** existing Playwright suite (`apps/loom/tests/e2e`)

Add an axe assertion failing on any critical/serious violation (Playwright +
`@axe-core/playwright`; confirm it's installed, else add).

### E3 — Three-scenario e2e

**File:** `apps/loom/tests/e2e/inclusive.spec.ts` (new)

| Scenario | Setup | Concrete assertion |
|---|---|---|
| Tired parent | `density=spacious, motion=reduced, literalLabels=true` | Controls grouped in one deck; plain-language readout labels present; empty panel collapses to a rail. |
| Distracted teen | `density=compact, motion=full, literalLabels=false` | Graph renders all nodes; labels visible above the zoom threshold; edge dimming active. |
| Dyslexic grandparent | `density=spacious, motion=none, literalLabels=true` | All text ≥12px; letter spacing wide; line height loose; Jitterbug does not autoplay; every panel has a visible exit. |

**Gate for Phase E:** `pnpm --filter @p31ca/canon verify:inclusive` exits 0;
axe passes; all three scenarios green.

---

## Resolved decisions (with rationale)

1. **Preferences live in the profile store, not the log.** Confirmed by
   `profiles.ts:1-8` ("presentation prefs are never written to the log"). A
   `loom.preference.set` event would break this and require gate work. Agents
   read prefs via `loom_observe`/`loom_mediate`, gated by
   `shareWithAgents.presentation`.
2. **`get_design_md` (agent plan P0) embeds the accessibility floor** — min
   12px, min 24×24 targets, plain-language-by-default, COGA "fewer than five
   main choices". Cheapest way the smallest agent inherits the bar.
3. **Plain language is deterministic** (`copy()` + `mediate()` reuse), not
   LLM-rewritten per view.
4. **Inclusive gate = static script + axe + three-scenario e2e.** Static catches
   mechanics; axe catches standards; scenarios catch context; human review is
   the ceiling.

## Non-goals (do not do in this package)

- No new event kinds, no log-schema changes, no gate changes.
- No gender field, no pronoun picker beyond what exists.
- No LLM-mediated dynamic rewriting.
- No WebGPU migration, no renderer swap (separate track).
- No redesign of the registry-graph declutter (already scoped elsewhere; this
  package only consumes `--loom-density` into it).

## Definition of done

Run in order, all green:

```
pnpm --filter @p31ca/canon test:loom
pnpm --filter @p31ca/canon verify:inclusive
pnpm --filter @p31ca/loom typecheck
pnpm --filter @p31ca/loom test
pnpm --filter @p31ca/loom test:e2e
```

Visual review of the three density tiers + three e2e scenarios against a live
build (dev server `pnpm --filter @p31ca/loom dev`, port 5191 — the deployed
static bundle has no `/api` and shows an empty log).

## Sources

- W3C WCAG 2.2 — SC 2.5.5 Target Size (AAA, 44×44), SC 2.5.8 Target Size
  Minimum (AA, 24×24), technique C44 (`min-height`/`min-width`).
- W3C COGA — "Avoid Too Much Content", "Use Clear Words", "Use Clear and
  Understandable Content".
- Nielsen Norman Group — UX Writing FAQ: 6th–8th grade reading level; plain
  language benefits all literacy levels.
- Optimizing mobile app design for older adults (systematic review, *Aging
  Clinical and Experimental Research*): enlarged text + touch targets,
  simplified navigation, error tolerance; ≥12pt text.
- ACM — "Revisiting Gendered Web Forms" (open text most inclusive; avoid
  "Other"; collect cis/trans only when needed).
- Carbon / Radix motion-token pattern: `prefers-reduced-motion` opt-out on the
  tokens themselves, one central place, no per-component media queries.
- NeuroAdaptX / Cognitive-Load-Theory literature: adapt structure, modality,
  density to self-reported profile without changing substance.
- SEGD "Vegas Paradox": spectacle that serves purpose (attention, pause,
  curiosity) is inclusive; spectacle for its own sake is exclusionary.
