<!-- P31-HEADER
id: p31_token_vocabulary_migration_20261010_v1.0
type: runbook
component: catalog
status: live
retention: keep-forever
created: 2026-10-10T00:00:00Z
owner: will
-->

# Token-Vocabulary Migration — CLI tooling → p31.* DTCG

> **Status: PLANNED — do not start until this runbook is approved.** The
> characterization is complete (`docs/fix-plans/catalog-pipeline-divergence.md`);
> the migration below is the execution plan.

## Decision

**Migrate the CLI tooling to the `p31.*` DTCG vocabulary** (canonical, matching
`@p31ca/canon@0.2.0`). Do **not** re-express `componentDefs.ts` in `primitive.*` —
that would regress the published packages and push the divergence into canon.

## Verified facts (2026-10-10)

Three token vocabularies coexist:

| Vocabulary | Example | Where |
|---|---|---|
| Old DTCG | `primitive.color.glass_surface` | `cli/tokens/tokens.yml`, `components.yml` component `tokens` |
| Short paths | `glass.bg`, `radius.full`, `accent` | `componentDefs.ts`, design-mcp worker |
| Canon DTCG | `p31.glass.bg` | `packages/canon/tokens/tokens.dtc.json` (452 leaf tokens) |

- `tokens.yml` has 238 leaf tokens across `primitive` (color/spacing/radius/
  typography/blur/shadow), `semantic` (color), `component` (glass_panel,
  glass_strong, btn_primary, …), plus `root`/`scale`/`spacing`/`typography`/
  `color`/`touch`/`z_index`/`animation`/`shadow`/`border`/`breakpoints`/`theme`
  and non-token groups (`metadata`, `examples`, `agent_prompt_injection`,
  `version_history`, `property-overrides`, `svg_rules`, `cascade_layers`,
  `bounding_boxes`, `layout_containers`, `spacing_rules`).
- `glass.bg`, `radius.full`, `topbar.height` do **not** exist in `tokens.yml`
  (verified) — the defs short paths match canon, not `tokens.yml`.
- 8 CLI consumers read `components.yml` / `tokens.yml` (all still on old DTCG):
  `cli/tokens/build-sovereign.mjs`, `cli/tokens/export-a2ui.mjs`,
  `cli/tokens/export-design-system.mjs`, `cli/design-mcp-server.js`,
  `cli/commands/health.ts`, `cli/commands/release.mjs`,
  `cli/commands/validate.ts`, `cli/validators/spatialValidator.mjs`.
- Field-mapping audit: `css_class`/`description`/`slots`/`variants`/`version`
  map 1:1 from `componentDefs.ts`; `tool`, `props.options`, `aiGuidance`, and
  `tokens` are the mismatches.

## Steps (run in order; each lands its own commit)

### 1. Inventory

Enumerate every leaf token in `tokens.yml` (238) with its full path, and every
leaf token in `tokens.dtc.json` (452). Produce a table: `yml path → p31.* path →
present-in-canon?`. Flag tokens that exist in `tokens.yml` but have no canonical
`p31.*` target, and tokens that exist in canon but not in `tokens.yml`.

Deliverable: `docs/enterprise/design-system/token-vocabulary-inventory.md`
(yml→p31 map + gap list).

### 2. Map

For each gap, decide: (a) rename to the canon path, (b) add a missing token to
canon, or (c) mark non-portable (CLI-only, not shipped). The `component` group
in `tokens.yml` (`glass_panel`, `btn_primary`, `starfield_brand_*`) is the
hardest — these are component-level tokens that may need per-component
disposition, not a global rename.

Deliverable: `docs/enterprise/design-system/token-vocabulary-map.md`
(final translation table + disposition).

### 3. Generate

Write `cli/tokens/gen-tokens-yml.mjs`: reads `tokens.dtc.json`, applies the
translation table, emits `tokens.yml`. Prove idempotence — run twice, `diff`
empty. Do the same for `components.yml` from `componentDefs.ts` (with the
`tool`/`props.options`/`aiGuidance` shape decisions resolved here).

### 4. Repoint

Migrate each of the 8 consumers, one commit each, smallest first:
`spatialValidator.mjs` → `health.ts` → `validate.ts` → `release.mjs` →
`export-a2ui.mjs` → `export-design-system.mjs` → `build-sovereign.mjs` →
`design-mcp-server.js`. Each commit shows the before/after token-path diff.

### 5. Gate

Add `scripts/check-token-vocabulary.mjs`: fails if any source file references
`primitive.` paths (outside `docs/` and the frozen grant/history set). Wire into
`pnpm gate` with a negative control.

### 6. Delete

Remove `tokens.yml` and `components.yml` as hand-maintained files; they become
generated artifacts (or are deleted if no consumer remains). Update the
`design-mcp` worker's `build.mjs` to read from the generated sources.

## Not in scope (separate, still open)

- `cli/component-registry.js` — third catalog (`phos-*` classes), its own
  reconciliation.
- `tools (1)/` duplicate tree — filesystem consolidation, not vocabulary.
- design-mcp worker deploy — build is fixed; deploy needs wrangler credentials.

## Estimated effort

2–4 sessions. Steps 1–2 are pure analysis; 3–5 are the mechanical bulk; 6 is
cleanup. Do not attempt as a single sweep — the `component` group token
disposition (step 2) is per-component judgment, not a find-replace.