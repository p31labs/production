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
The Storybook-derived pipeline (manifest → `catalog.json` → `registry.json`)
became authoritative by virtue of being regenerated from live code, while the
yml/defs catalog and `cli/component-registry.js` froze.

## Recommendation (needs decision)

Make **catalog 2 (`registry.json`, Storybook-derived) authoritative**:

1. Regenerate `componentDefs.ts` from the Storybook manifest (or from
   `registry.json`), so `design-mcp` and the generator serve the same 32
   components with the same classes.
2. Deprecate or delete `cli/tokens/components.yml` and
   `cli/component-registry.js`, re-pointing any remaining consumers to
   `registry.json`.
3. Reconcile the 3 same-name drifts to the registry values (`btn`,
   `starfield-bg`, `badge`), and resolve the `StatusBadge`/`Badge → badge`
   collision.
4. Fix the stale `p31labs/P31-local-workspace` reference in
   `workers/design-mcp/src/index.ts:988`.

## Impact

- The `design-mcp` MCP server and the component generator currently expose a
  stale 27-component catalog (missing 19 current components, carrying 14
  dropped ones, and disagreeing on 3 class names with `registry.json`).
- Any agent composing UI against `design-mcp`'s output uses classes
  (`btn-primary`, `status-badge`, `spoon-meter`) that do not exist in the
  current CSS (`btn`, `badge`, `spoon-dial`).
- Until reconciled, the matcher's child-class work (and any component-level
  adjudication) sits on a moving target.

## Relationship to token-consumption-matcher-bugs

This supersedes the childClasses delivery decision: once one authoritative
catalog exists, `childClasses` can be added there (or derived from
`compositions/*.tsx`) without the four-layer ambiguity described in
`token-consumption-matcher-bugs.md`.