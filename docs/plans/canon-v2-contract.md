<!-- P31-HEADER
id: p31_plan_canon_v2_contract_20261012_v1.0
type: plan
component: design-core
status: live
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

# Canon v2 — the vessel contract

**Goal:** a design system that lets the production Chameleon shell portal act
as a vessel for the P31 ecosystem. The marketplace was the first real test
after the overhaul; it failed on missing primitives, a self-contradicting
spec, and conflated page modes. Canon v2 fixes the system, not the instance.

## Research-validated architecture (2026-10-12)

1. **Cascade layers** — `@layer legacy, canon.tokens, canon.components,
   canon.layout, shell, face;`. Gotcha enforced by canon-lint: unlayered CSS
   beats every layer. Legacy classes (workspace.css surface-panel/setup-input/
   step-row) are quarantined in `legacy` and deleted face-by-face as ports land.
2. **Attribute-scoped styles** — `[data-p31="x"]` (attribute-only, the fast
   form; never element-prefixed). No bare class names in new canon CSS.
3. **Layout primitives** — Shell, Page (four modes: flow / fill / panel-scroll /
   fit — NO global height-100% flex shell on flow routes), PageHeader, Stack,
   Grid, Split; matching Salt/Willa/Calcite practice.
4. **Controls** — Field, Input, Textarea, Select, Tabs, Menu, Dialog/Sheet —
   all with `--p31-control-h: 44px` baked in, `align-self: start`, UI-font
   inherit. Raw `<select>/<input>/<textarea>` outside canon is forbidden
   (manifest forbidden list + raw-element gate).
5. **States** — EmptyState, ErrorState, Skeleton.
6. **Patterns** (the missing layer — NN/g: a component library is not a design
   system) — ListingShell (search/filter row + card grid + empty state),
   DetailShell (summary + focus + actions), Wizard ("Step N of M", one question
   group per step). Patterns ship WITH canon, never as face forks.
7. **Face contract** (next wave) — each face declares: id, route, nav entry +
   canon icon, `mode`, regions, capabilities + spoon cost (gates CrisisOverlay
   / SpoonDial), lifecycle events → audit ledger with face id as
   `action_class`.
8. **Audit** — reconcile with IETF AAT draft: add `record_id` (UUIDv4) +
   RFC 3339 `timestamp` + pre-execution recording
   (`docs/fix-plans/audit-schema-aat-reconciliation.md`).

## Gates (each with a proven negative control)

- `canon-lint.mjs` — unlayered imports, raw controls, legacy classes, hex
  outside tokens.
- `render-gate.mjs` — Playwright 375/768/1280 × themes; no control >64px, no
  horizontal overflow, content clears topbar, no adjacent duplicate strings,
  cards ≥240px, screenshot diffs. FAILS against today's marketplace (baseline
  evidence captured in `docs/fix-plans/render-gate-baseline-failures.md`).
- `check-cognitive-load.mjs` + `plain-language-scan.mjs` — already wired.

## Order (single writer)

1. Spec reconciliation (manifest: new components, forbidden list, fix the
   missing-Card and zero-CSS contradictions) — in flight.
2. Canon v2 in design-core + canon (layers, tokens, primitives, controls,
   states, patterns) — in flight.
3. Render gate failing-first — in flight.
4. Port the marketplace onto canon v2 (smallest real face = the proof).
5. Port Sandbox split + page-fill into Split + Page mode="panel-scroll"/"fill".
6. Face-contract manifest → Chameleon shell vessel.