# fix: three divergent component catalogs — components.yml vs registry.json vs cli/component-registry.js

<!-- P31-HEADER
id: p31_fix_plan_catalog_pipeline_divergence_20261010_v1.0
type: fix-plan
component: catalog
status: open
retention: keep-forever
created: 2026-10-10T00:00:00Z
owner: will
-->

## Symptom

The design system is served from three independently-evolved component
catalogs that no longer agree. This was surfaced while sizing the
`token-consumption.mjs` child-class fix, whose `registry.json` is only one of
the three. The catalogs:

| # | Source | Shape | Count | Consumers |
|---|---|---|---|---|
| 1 | `cli/tokens/components.yml` → `src/componentDefs.ts` | name → `css_class` (snake) | 27 | `design-mcp` server, `design-core` generator, `generated-wc/*` |
| 2 | Storybook manifest → `src/genui/catalog.json` → `registry.json` | name → `cssClass` | 32 | `token-consumption.mjs`, design portal, marketplace, `component-registry` MCP |
| 3 | `cli/component-registry.js` → `workers/component-registry/src/registry.js` | name → tokens/example (`phos-*`, Tailwind-style) | ? | `component-registry` MCP |

Catalog 2 is internally coherent: `catalog.json` and `registry.json` match
1:1 (32 = 32). The divergence is **catalogs 1 and 3 being stale relative to
catalog 2** (which is derived from the actual `.stories.tsx` + `compositions/`
via Storybook).

## Evidence (verified 2026-10-10)

Cross-reference of `name → css_class` across `components.yml` and `registry.json`
(46 unique names total):

- **Shared, consistent (10):** Badge, BottomNav, CandyHeader, Card,
  CrisisOverlay, Crown, GlassCard, GlassPanel, SpoonDial, Topbar.
- **Same name, different class (3, real drift):**
  - `Button`: `btn-primary` (yml) → `btn` (registry)
  - `Starfield`: `starfield` (yml) → `starfield-bg` (registry)
  - `StatusBadge`: `status-badge` (yml) → `badge` (registry; collides with
    `Badge → badge`)
- **yml-only (14, dropped from current catalog):** BreakOverlay, ChatBubble,
  CompanionCard, GameCard, GlassStrong, GlassSubtle, HonestLabel, MoodBtn,
  PinKey, SpoonMeter, TetraGrid, ThemeToggle, Toast, Toggle.
- **registry-only (19, added after yml went stale):** CalmIndicator,
  CalmOverlay, Chameleon, ChatShell, Checkbox, CommandPalette, CommandTrigger,
  Dropdown, Footer, MetricBadge, MobileBottomNav, ModePill, NotificationStack,
  PageHeader, SectionStrip, SidebarNav, SpoonCluster, StatusCluster,
  TopbarSection.

`SpoonMeter → spoon-meter` (yml) is a **separate legacy component**, NOT drift
from `SpoonDial → spoon-dial` — both exist in yml; only SpoonDial survived.

Consumers of the stale catalog 1:
- `workers/design-mcp/src/data.ts:1` — "Auto-generated from
  cli/tokens/tokens.yml + components.yml + p31-icon-pack/icons".
- `workers/design-mcp/src/index.ts:988` — still references the pre-migration
  GitHub path `p31labs/P31-local-workspace/blob/main/cli/tokens/components.yml`.
- `packages/design-core/src/generator/*` and `src/generated-wc/*.wc.js` — built
  from `componentDefs.ts`.

Catalog 3 (`cli/component-registry.js`) uses yet another scheme (`phos-glass`,
`rounded-3xl` class names in its examples), so it is stale against both others.

## Root cause

`components.yml` labels itself "Single source of truth" (line 2) but was never
reconciled when the component set moved to Storybook + `compositions/*.tsx`.
The canonical source became `packages/design-core/src/componentDefs.ts` (32
components, header "Source of truth"), and `components.yml` (27) froze.

**Correction to the symptom table:** `componentDefs.ts` is CURRENT (32, not
stale). The stale layer is `components.yml` (27) alone. `catalog.json` and
`registry.json` are both generated from `componentDefs.ts` and are in sync.

**Not-stale classes:** the CSS variant classes `glass-strong`, `glass-subtle`,
`btn-primary`, `btn-secondary`, `btn-ghost` DO exist in the current CSS (2
files each). `components.yml` listed `GlassStrong`/`GlassSubtle` as *separate
components*, but they are now *variants* of GlassCard/Button — the drift was
component-level, not CSS-level. Hardcoded template strings in `design-mcp`
referencing these classes are correct and were left untouched.

## Progress (2026-10-10)

**design-mcp Worker fixed (the live server).** The Worker served the stale 27
components through `propose_component` and `audit_tokens` (via the
`components.yml`-derived `components` export in `data.ts`), while its tool
handlers already used the current `COMPONENT_DEFS` (32). Repointed:

- `workers/design-mcp/src/proposer.ts` — `components.components` → `COMPONENT_DEFS` (scoreComponents + proposeComponent).
- `workers/design-mcp/src/index.ts` — `propose_component` + `audit_tokens` → `COMPONENT_DEFS`; `componentsUrl` → `packages/design-core/src/componentDefs.ts`.
- `workers/design-mcp/src/data.ts` — removed the dead `components` export (511 lines) and the stale `SpoonMeter` CATALOG append (no `.tsx`, no CSS).
- `workers/design-mcp/build.mjs` — stopped generating `components` from `components.yml` (tokens + icons remain).

`SpoonMeter` confirmed fully stale: no `compositions/SpoonMeter.tsx`, no
`.spoon-meter` in CSS.

## Progress (2026-10-11)

**Locked decision executed: `componentDefs.ts` is the single source;**
`components.yml` is now a DERIVED artifact.

1. **Generator shipped** — `packages/design-core/scripts/generate-components-yml.mjs`
   (plain `node`, native TS import of `componentDefs.ts`). Run:
   `node packages/design-core/scripts/generate-components-yml.mjs`
   (`--check` for CI; npm scripts `components-yml:gen` / `components-yml:check`
   added to `packages/design-core/package.json`). Deterministic: defs insertion
   order, fixed key order, block-style YAML, no timestamps, single-line scalars
   (stays parseable by both the `yaml` package and the design-core generator's
   minimal `parseYamlSimple`).

2. **`cli/tokens/components.yml` regenerated** — 32 components. The
   "Single source of truth" claim is gone; header marks it DERIVED with the
   generator path. Field mapping per the audit:
   - `tokens` carry the defs vocabulary verbatim (`p31.*` DTCG — matches canon
     `tokens.dtc.json`; all 142 defs token refs verified `p31.*`).
   - `aiGuidance` is the ARRAY form (new canonical shape).
   - `tool` derived deterministically (`render` + name, the legacy convention).
   - `props.options` omitted (defs define none — mapped only where they exist).
   - Cross-reference verified: Button→`btn`, Starfield→`starfield-bg`,
     StatusBadge→`badge`, Badge→`badge` (collision preserved, matches
     registry.json).

3. **Note on the 8 consumers:** since this plan's audit, commit `818f9c3`
   ("complete p31.* token-vocabulary migration") deleted `components.yml` and
   repointed all 8 consumers to `packages/design-core/registry.json`. So the
   regenerated yml is not read by them today — it is the derived artifact for
   the design-core generator pipeline (`src/generator/shared.ts` →
   `COMPONENTS_YAML`, which had been reading a missing file since the deletion).
   All 8 consumers verified against their current source (registry.json):
   - `export-a2ui.mjs` → 32 components, exit 0.
   - `export-design-system.mjs` → 32 components + 32 `tools` entries, exit 0.
     Updated: `tool` now derives `render<Name>` from registry items (was hard
     `null`, which emptied the tools section); `aiGuidance` enriched from
     `src/genui/catalog.json` (registry.json is a shadcn projection that drops
     it) and emitted in the array form.
   - `cli/design-mcp-server.js` → `node --check` OK; reads registry.json
     (cssClass/props loop) — untouched (parallel agent owns it).
   - `health.ts` / `validate.ts` → defaults point at registry.json; exercised
     via the same `spatialValidator.mjs` code path: `--health --machine-readable`
     exit 0 (score 97) and audit mode exit 0.
   - `spatialValidator.mjs` (line 363 default) → health + audit runs green.
   - `release.mjs` → `node --check` OK (registry.json is in FILES_TO_RELEASE).
   - `build-sovereign.mjs` → **pre-existing failure at the token stage**
     (`Missing token: root.base_unit` — stale `primitive.*`/`semantic.*`/`root.*`
     placeholders in the CSS templates vs the migrated `tokens.yml`), aborts
     before writing anything (verified 0 file changes). This is NOT a catalog
     regression; filed separately:
     `docs/fix-plans/build-sovereign-token-template-migration.md` (open).
   - Side fix: `packages/design-core/src/generator/adapters/html.ts` +
     `src/generator/shared.ts` now tolerate the array-form `aiGuidance`
     (joined for display) — the generator pipeline reads the regenerated yml.

4. **design-mcp worker build** — `npx tsc --noEmit` is GREEN (exit 0, 17 src
   files type-checked). The 8 pre-existing errors (incl. the missing
   `./icons-data` lazy import at `index.ts:126`) were already fixed by commit
   `e1a2cdd` (a parallel effort); verified rather than re-fixed. `build.mjs`
   runs clean (regenerates `data.ts`; the only diff was the `generatedAt` date
   stamp, which was reverted to avoid churn — noted for a future
   deterministic-output pass).

5. **Third catalog reconciled** — `cli/component-registry.js` +
   `workers/component-registry/src/registry.js` no longer serve stale
   `phos-*`/Tailwind-example data (PillButton, SpoonDots, TetraHeader, Willow*
   etc. are gone). New generator `scripts/generate-component-registry-data.mjs`
   patches the `COMPONENTS` array in both files (between `GENERATED COMPONENTS`
   markers) from `componentDefs.ts`: 32 canonical entries with `p31.*` tokens,
   `css_class`, props, variants, aiGuidance, and a derived `example`
   (first defs guidance example, else a `css_class` skeleton). Both files carry
   a DEPRECATED banner pointing at `registry.json`. The MCP surface is intact
   and behavior-verified end-to-end: `tools/list` → same 5 tools;
   `design_list_components` → 32; `design_get_component` → canonical entry;
   `design_search 'spoon'` → 5 canonical results; `design_get_tokens` /
   `design_spoon_guide` unchanged; unknown-name error path still works.
   `workers/component-registry` `npm run build` (tsc --noEmit) green.
   `scripts/sync-component-registry.mjs` updated to validate the canonical
   `p31.*` dotted paths (direct CSS-var mapping) and to stop double-prefixing
   the `p31` token group; `apps/phos/public/.well-known/design-system.json`
   regenerated (15 → 32 components, 32 tools). Result: sync report
   **32 components, 0 missing, 0 alias suggestions**.

## Remaining (still open)

- `build-sovereign.mjs` template migration (filed:
  `docs/fix-plans/build-sovereign-token-template-migration.md`) — blocks the
  canonical regeneration of the well-known `design-system.json` and A2UI
  catalog; direct export used as stopgap today.
- The `design-mcp` worker's `build.mjs` embeds `generatedAt` (today's date) in
  `data.ts` — rebuilds are non-deterministic; consider deriving from git or
  dropping the field.
- Legacy `TOKEN_REFERENCE` (colors/typography/rounded/spacing + invariants)
  served by `design_get_tokens` in the deprecated component-registry surface is
  still the old vocabulary — left alive deliberately (tool behavior preserved);
  migrate or remove when the surface is retired.

## Remaining (needs decision)

`components.yml` (stale 27) is still read LIVE by 8 CLI consumers, none of
which were changed this turn:

1. `cli/tokens/build-sovereign.mjs` — tool→token bindings (line 255)
2. `cli/tokens/export-a2ui.mjs` (line 21)
3. `cli/tokens/export-design-system.mjs` (line 25)
4. `cli/design-mcp-server.js` (line 84)
5. `cli/commands/health.ts` — default `--components` path
6. `cli/commands/release.mjs` — "Component Registry" entry
7. `cli/commands/validate.ts` — default `--components` path
8. `cli/validators/spatialValidator.mjs` (line 363)

Two ways forward:

- **Dual-source sync (low risk):** regenerate `components.yml` from
  `componentDefs.ts` (32, current) so all 8 consumers get current data without
  code changes. Keeps two sources — drift can recur.
- **Single source (correct, larger):** repoint the 8 consumers to
  `componentDefs.ts`. Requires handling the shape difference (yml `tool` field,
  string `aiGuidance`, old-style `primitive.*` tokens vs array `aiGuidance` +
  short token paths).

**Source-of-truth verdict (2026-10-10):** `componentDefs.ts` is
HAND-MAINTAINED — single commit (`0be3bbe`, the SSOT arc), no generator writes
it, header "Source of truth" is a convention not a generated fact. Per the
review's decision tree, the correct fix is to ADD a generator
(`componentDefs.ts` → `components.yml`) so the yml becomes a derived artifact
and the 8 consumers keep reading it unchanged — not to repoint them. The shape
mapping (yml `tool`/`props.options`/old-style `primitive.*` tokens) is the
design task to scope next.

**Field-mapping audit (2026-10-10):** the 8 consumers read these yml fields —
`css_class`, `description`, `props`, `slots`, `tokens`, `variants`, `version`,
`aiGuidance` (export-design-system only), `tool` (export-design-system only).
Clean 1:1 mappings exist for `css_class`, `description`, `slots`, `variants`,
`version`. The mismatches are:

- `tool` — yml-only render-function name; no `componentDefs.ts` equivalent.
- `props.options` — yml-only; `componentDefs.ts` props are React-style
  (`type`/`required`/`default`/`description`) with no `options`.
- `aiGuidance` — yml strings vs defs arrays.
- `tokens` — **three divergent vocabularies**, not a rename:
  1. `tokens.yml` / `components.yml`: `primitive.color.glass_surface` (old DTCG)
  2. `componentDefs.ts`: `glass.bg`, `radius.full`, `accent` (short paths)
  3. canon `tokens.dtc.json`: `p31.glass.bg`, `p31.radius.full` (DTCG)

  Verified: `glass.bg`, `radius.full`, `topbar.height` do **not** exist in
  `tokens.yml`. The defs paths match canon, not tokens.yml.

**Conclusion:** the generator is NOT a mechanical shape mapping. The 8 CLI
consumers operate on the OLD token system (`tokens.yml` + `primitive.*`
paths), while `componentDefs.ts`, canon, and the (now-fixed) design-mcp worker
operate on the NEW system (short paths / `p31.*` DTCG). Building a
`componentDefs.ts → components.yml` generator requires a **token-system
migration decision** first: which vocabulary is canonical, and what the
`primitive.* ↔ glass.bg ↔ p31.*` mapping table is. That is architectural, not
scriptable, and is the same class of reconciliation as the token deprecation
work already done for the canon side — but for the CLI tooling side, which has
not been migrated.

**design-mcp build verdict (2026-10-10):** `npx tsc --noEmit` fails with 8
errors, ALL pre-existing (validator.ts untouched by this change; `./icons-data`
module never committed; `proposer.ts:368` proposeIcon type). This change
introduces zero new type errors, but the Worker was already not buildable — the
`./icons-data` lazy import at `index.ts:126` would also fail at runtime. The
repoint is correct but not independently deployable until the pre-existing
build failures are fixed.

Also outstanding, unrelated but found: stale GitHub URLs swept —
`p31labs/P31-local-workspace` → `p31labs/production` (35 occurrences across 25
live source/config files). Remaining refs are intentionally frozen (grant
submissions in `docs/grants/*`, workpackages, changelogs) or in the duplicate
`software/` tree (a separate consolidation issue).

## Impact

- The live `design-mcp` Worker now serves the current 32-component catalog in
  every code path.
- The 8 CLI tools still read the stale 27-component `components.yml` until the
  dual-source/single-source decision lands.
- `cli/component-registry.js` remains a third stale catalog (separate shape,
  `phos-*` classes) feeding the `component-registry` MCP.

## Relationship to token-consumption-matcher-bugs

With one authoritative catalog (`componentDefs.ts`, already 32), `childClasses`
can be added there or derived from `compositions/*.tsx`, resolving the
four-layer ambiguity in `token-consumption-matcher-bugs.md`.