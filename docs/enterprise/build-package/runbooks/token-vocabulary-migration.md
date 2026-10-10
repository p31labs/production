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

> **Status: active — awaiting user approval to begin.** The characterization is
> complete (`docs/fix-plans/catalog-pipeline-divergence.md`); the steps below
> are the execution plan. Do not start step 1 until the user approves the
> vocabulary decision.

## Decision (recommended, pending approval)

**Migrate the CLI tooling to the `p31.*` DTCG vocabulary** (canonical, matching
`@p31ca/canon@0.2.0`). Do **not** re-express `componentDefs.ts` in `primitive.*` —
that would regress the published packages and push the divergence into canon.

## Verified facts (2026-10-10)

Three token vocabularies coexist:

| Vocabulary | Example | Where |
|---|---|---|
| Old DTCG | `primitive.color.glass_surface` | `cli/tokens/tokens.yml`, `components.yml` component `tokens` |
| Short paths | `glass.bg`, `radius.full`, `accent` | `componentDefs.ts`, design-mcp worker |
| Canon DTCG | `p31.glass.bg` | `packages/canon/tokens/tokens.dtc.json` |

**Corrected counts (apples-to-apples, verified 2026-10-10):**

- `tokens.dtc.json` = 452 leaves TOTAL, but that is NOT the vocabulary. It
  decomposes to: **`p31` subtree = 184 distinct tokens**, **`themes` = 243**
  (per-theme value overrides, **out of scope** — value swaps, not token names),
  plus `$schema`/`$extensions`.
- **The `p31` subtree mixes two intentional forms** (205 raw leaves → 184
  distinct CSS names). Primitives/compat emit flat names (`p31.radius-sm`, from
  `BASE`/`GLOBAL_COMPAT` via `bare()`); semantic slots nest by dotted path
  (`p31.radius.sm`, from `SEMANTIC_MAP`). 21 tokens carry both forms; values are
  identical across all 21 (verified). **Both forms are consumed** — contracts
  (`*.contract.ts`) read the nested form, CSS reads the flat form
  (`--p31-radius-sm`). This is the documented "mixed flat-leaves + nested
  groups" design (see `gen-tokens.mjs`), NOT a bug. Latent fragility only: if
  the two forms ever diverge, the flatten-based tools (`check-token-parity`,
  the deprecation merge) would see one and not the other.
- `tokens.yml` = 238 leaves TOTAL. The token/non-token split is NOT a fixed
  list — it must be determined by step 1's inventory. Verified so far:
  `primitive` (71), `semantic` (20), `component` (74) are tokens; **`breakpoints`
  (5), `touch` (3), `z_index` (5) are ALSO token groups** (previously
  misclassified as non-token); `theme` and `property-overrides` have
  non-standard structures (theme = nested hex values without `$value`;
  property-overrides = 58 `$value` leaves + 18 brand-config keys). Truly
  non-token groups: `metadata`, `version`, `version_history`, `examples`,
  `agent_prompt_injection`, `svg_rules`, `cascade_layers`, `spacing_rules`,
  `layout_containers`, `bounding_boxes`.
- The migration therefore maps `tokens.yml`'s token leaves → the `p31`
  subtree's 184 distinct tokens, with the overlap/gap determined in step 1 (not
  assumed).
- The **`component` group = 74 leaves across 13 components** (`glass_panel`,
  `header_candy`, `crown_xs`, `spoon_icon`, `glass_card`, `glass_strong`,
  `glass_subtle`, `btn_primary`, `btn_secondary`, `btn_ghost`, `starfield`,
  `starfield_brand_p31ca`, `starfield_brand_phosphorus31`) — the per-component
  disposition, not a find-replace.
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

Enumerate every leaf token in `tokens.yml` with its full path, and every
distinct token in the `p31` subtree of `tokens.dtc.json` (184). Produce the
table: `yml path → p31.* path → present-in-canon?`. Flag yml tokens with no
canonical `p31.*` target, and `p31.*` tokens with no yml equivalent.

This step also finalizes the token/non-token split in `tokens.yml` — the
`breakpoints`/`touch`/`z_index`/`theme`/`property-overrides` classification is
NOT settled by the heuristic above. **`property-overrides` needs an explicit
ruling**: it is a mixed group (58 `$value` token leaves + 18 brand-config keys).
Choose one: (a) split into `property-overrides.tokens` + `property-overrides.config`,
(b) treat the whole group as tokens, or (c) treat the whole group as non-token
and preserve it verbatim in the `tokens-meta.yml` sidecar. Record the ruling
here; the generator (step 3) follows it.

Deliverable: `docs/enterprise/design-system/token-vocabulary-inventory.md`.

### 2. Map

**Categorization first, per-token adjudication second.** The 56 unmatched
primitives cluster into **9 semantic groups** by yml category (verified
2026-10-10), not 56 scattered decisions:

| yml cluster | count | p31 target |
|---|---|---|
| `color.accent` (cyan/violet/gold/green/red/iris) | 6 | `p31.accent.*` |
| `color.glass_*` | 10 | `p31.glass.*` |
| `color.surface/void/void_sN` | 8 | `p31.surface.*` / `p31.void` |
| `color.neon_*` | 12 | `p31.neon.*` |
| `color.starfield_*` | 5 | `p31.starfield.*` |
| `shadow.glow_*` + `shadow.glass` | 9 | `p31.shadow.*` |
| `color.text_tertiary` | 1 | `p31.text.tertiary` |
| `radius.xl` | 1 | `p31.radius.xl` |
| `typography.font_sans/mono` | 2 | `p31.font.*` |

Proceed category-by-category: for each, produce the category-level translation
row (`primitive.color.cyan` → `p31.accent.cyan`), then adjudicate exceptions
token-by-token (rename / add-missing / non-portable). The 74-leaf `component`
group is the hard part — each of its 13 components needs disposition against the
CSS variant classes, not a global rename.

Deliverable: `docs/enterprise/design-system/token-vocabulary-map.md`.

### 3. Generate (partial merge, NOT full derivation)

`tokens.yml` carries non-token groups that `tokens.dtc.json` cannot produce
(their exact set is settled by step 1's inventory). So the generator is a
**partial merge**, not a full emit:

- `cli/tokens/gen-tokens-yml.mjs` — reads `tokens.dtc.json` `p31` subtree +
  the translation table → emits ONLY the groups step 1 classifies as tokens.
  The non-token groups are preserved from a sidecar
  (`cli/tokens/tokens-meta.yml`) that is split out in step 3a.
- **Output form:** the generator emits the **nested** form (`p31.radius.sm`) —
  the form the current yml consumers read. Verify against
  `cli/tokens/export-design-system.mjs` and `build-sovereign.mjs` before step 4.
  The 21 dual-form tokens (flat `p31.radius-sm` + nested `p31.radius.sm`) must
  be emitted **once, in the nested form**, not duplicated.
- Prove idempotence: run twice, `diff` empty.
- `cli/tokens/gen-components-yml.mjs` — reads `componentDefs.ts` → emits
  `components.yml`, resolving `tool`/`props.options`/`aiGuidance` shape decisions
  here.

Deliverable: both generators + the `tokens-meta.yml` split.

### 4. Repoint

Migrate each of the 8 consumers, one commit each, smallest first:
`spatialValidator.mjs` → `health.ts` → `validate.ts` → `release.mjs` →
`export-a2ui.mjs` → `export-design-system.mjs` → `build-sovereign.mjs` →
`design-mcp-server.js`. Each commit shows the before/after token-path diff.

### 5. Gate

Add `scripts/check-token-vocabulary.mjs`: fails if any source file references
`primitive.` token paths. Exclusions: `docs/**`, `packages/canon/**`,
`cli/tokens/tokens-meta.yml` (the preserved sidecar), and the generator itself
(`cli/tokens/gen-*.mjs`). Wire into `pnpm gate` with a negative control.

### 6. Delete

Remove `tokens.yml` and `components.yml` as hand-maintained files; they become
generated artifacts (or are deleted if no consumer remains). Update the
`design-mcp` worker's `build.mjs` to read the generated sources.

## Not in scope (separate, still open)

- **design-mcp deploy** — build/typecheck pass; the worker is NOT yet deployed.
  `cd workers/design-mcp && npx wrangler deploy` (needs credentials). The
  running worker may be stale until this happens.
- `cli/component-registry.js` — third catalog (`phos-*` classes), its own
  reconciliation.
- `tools (1)/` duplicate tree — filesystem consolidation, not vocabulary.

## Estimated effort

2–4 sessions. Steps 1–2 are pure analysis; 3–5 are the mechanical bulk (the
`component` group disposition in step 2 is the per-component judgment); 6 is
cleanup. Do not attempt as a single sweep.