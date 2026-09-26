# BUILD_SPEC.md — Design System Portal (Quantum Material Build Rules)

**Version:** 1.0.0 · **Date:** 2026-09-24 · **Applies to:** `production/portals/design/` + canon 3.0.0.
Gate evidence beats agent assertion. Invariants marked MUST are blocking.

---

## §1 Design Stance

**Quantum Material** = OKLCH perceptual color, glass-with-limits, spoon-aware motion, calm floor, and
agent-inspectable surfaces. The portal is the reference consumer of the canon; its `src/tokens.css`
(hue-270 neutrals) is the default, worlds layer on top via Chameleon.

## §2 Invariants (MUST)

| ID | Invariant | Evidence |
|---|---|---|
| INV-01 | All colors OKLCH / `color-mix(in oklch, …)`. Raw hex/rgba forbidden in design sources. | `node <dc>/scripts/token-audit.mjs` → `Token audit OK` |
| INV-02 | Portal `src/tokens.css` imports LAST (after canon css) so the portal stance wins. | `src/index.css` |
| INV-03 | Hue-270 neutral family: void/bg/surface/surface2/text at `oklch(… 270)`. | `src/tokens.css` |
| INV-04 | Quantum accent set: cyan 195 / violet 285 / gold 85 / green 155 / red 15 / iris 275. | `src/tokens.css` |
| INV-05 | Glass uses `color-mix(in oklch, white X%, transparent)` + `--p31-glass-blur: blur(20px)` (10px ≤768px; none under reduced-transparency). | `src/tokens.css` |
| INV-06 | Motion contract: `--motion-scale` 1/0.6/0.2/0 by spoons 4-5/3/1-2/0; transitions `calc(base × var(--motion-scale))`. | `src/App.tsx` + `src/tokens.css` |
| INV-07 | Every surface root carries `data-mcp-tool` (per-route via `.portal-main`). | `src/lib/mcpTools.ts` |
| INV-08 | Spoons 0 → CrisisOverlay calm floor (only chrome). | `src/App.tsx` |
| INV-09 | Do not edit `vendor/*.tgz`; re-pack from `P31-local-workspace/packages/design-core`. | `pnpm install` + `v:gate` |
| INV-10 | Tokens/Glass/Brands/Recipes/MCP/A11y/Icons inherit the new stance — no hex re-introduction. | token-audit |
| INV-11 | **Cascade layer order.** `src/index.css` declares `@layer base, legacy, vendors, suite, content;`. Design-core css → `vendors`; tokens/workspace/globals → `suite`; bespoke tiles → `content`; old bespoke rules → `legacy` (lowest, sunset). No unlayered rules after the imports (unlayered CSS beats every layer). | `src/index.css` |
| INV-12 | **Flex scroll containers.** Any flex item that hosts scrollable content must declare `overflow-y: auto` AND `min-height: 0` (the flex min-size clamp silently disables scroll). Applied to `.sidebar` across design/workspace/mcp-marketplace. | `workspace.css` `.sidebar` |

## §3 Token Map (portal-owned, canon-compatible)

| Token | Value (OKLCH) | Role |
|---|---|---|
| `--p31-void` | `oklch(0.08 0.005 270)` | base bg |
| `--p31-bg` | `oklch(0.1 0.008 270)` | portal canvas |
| `--p31-surface` / `--p31-surface2` / `--p31-surface3` | `oklch(0.14/0.2/0.28 … 270)` | elevation tiers |
| `--p31-text` / `-secondary` / `-tertiary` | `oklch(0.96/0.8/0.66 … 270)` | text tiers |
| `--p31-accent-cyan` | `oklch(0.78 0.18 195)` | primary |
| `--p31-accent-violet/gold/green/red/iris` | 285/85/155/15/275 | supporting |
| `--p31-glass-bg` | `color-mix(in oklch, white 4%, transparent)` | glass fill |
| `--p31-glass-border` | `color-mix(in oklch, white 8%, transparent)` | hairlines |

Full canon map (DTCG OKLCH): `manifest.json` + `tokens/tokens.json` in the design-core source.

## §4 Surface Build Pattern

1. File: `src/routes/<Name>/<Name>.tsx` (flagships) or `src/routes/<Name>/<Name>.tsx` (supporting).
2. Named default export.
3. Root: `<div data-mcp-tool="<tool>Surface" data-mcp-state="ready">` (or rely on the shell wrapper).
4. Headers via `PageHeader` (design-core compositions).
5. Live previews via `LivePreview`/`GlassPanel` — never mocked when a composition exists.
6. Marketplace/Catalog data from `@p31ca/design-core/genui/catalog` (`COMPONENT_CATALOG`) or `./mcp/data`.
7. Companion test in `src/__tests__/Routes.test.tsx` (render smoke).

## §5 MCP Integration

- Registry: `src/lib/mcpTools.ts` — `MCP_TOOLS` (per-surface attributes) + `MCP_HANDLERS`
  (`mcp_design_showcase`, `mcp_design_marketplace`, `mcp_design_catalog`, `mcp_design_playground`, …).
- The shell sets the attribute on `.portal-main` per route; the canon ships its own MCP server
  (`@p31ca/design-core/mcp`) with `get_token`, `search_tokens`, `get_component`, `list_components`,
  `validate_token_usage`, `check_contrast`, `generate_theme`, `scaffold_component`, `suggest_migration`.

## §6 Deploy Pipeline

```bash
# 1. Canon changed? re-pack + re-vendor
cd ../../../P31-local-workspace/packages/design-core
node scripts/token-audit.mjs && npm pack   # → p31-design-core-3.0.0.tgz (rename if scoped)
cp p31-design-core-3.0.0.tgz ../../production/portals/design/vendor/ && cp … workspace/vendor/

# 2. Portal gate chain
cd ../../../production/portals/design
pnpm install --ignore-workspace
pnpm typecheck && pnpm lint && pnpm test && pnpm build
node <dc>/scripts/token-audit.mjs && pnpm v:gate

# 3. Baseline + deploy
./scripts/freeze-baseline.sh
pnpm deploy            # wrangler pages → p31-portal-design → design.p31ca.org
curl -I https://design.p31ca.org   # expect 200
```

## §7 Verification (verified 2026-09-24)

| Gate | Command | Observed |
|---|---|---|
| Types | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | 0 errors |
| Unit | `pnpm test` | 19/19 pass |
| Build | `pnpm build` | dist/ emitted (all 11 chunks) |
| Tokens | `node <dc>/scripts/token-audit.mjs` | `Token audit OK` |
| Vendor | `pnpm v:gate` | `v:gate PASS (2 package(s))` |