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

Also outstanding, unrelated but found: `p31labs/P31-local-workspace` →
`p31labs/production` stale GitHub URLs in `workers/federation-bridge`,
`workers/mcp-registry`, `workers/personal-swarm`, `apps/p31ca/src/data/*`.

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