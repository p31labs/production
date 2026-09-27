# SYSTEM_ARCHITECTURE.md — P31 Design System Portal

**Version:** 1.0.0 · **Date:** 2026-09-24 · **Status:** Production (live at design.p31ca.org)
**Canon:** `@p31ca/design-core` 3.0.0 (vendored tarball; source in `P31-local-workspace/packages/design-core/`).
This file is the **architecture contract** — what is true. Update it when anything here changes.

---

## §1 Overview

The Design System Portal is the reference consumer + showroom for the P31 Quantum Material canon. It is a
React 19 + Vite 6 + React Router SPA consuming `@p31ca/design-core` as a vendored source-first tarball
(exports → `src/*.ts`). It demonstrates the full design language live: OKLCH hue-270 neutrals, quantum
accents, glass-with-limits, spoon-driven motion, calm floor, and agent-inspectable surfaces.

Deployment: Cloudflare Pages project **`p31-portal-design`**, domain **`design.p31ca.org`** (`pnpm deploy`).
Two HTML entries: `index.html` (this portal) + `design.html` (the focused `DesignRoute` spec view).

## §2 Information Architecture (Quantum Material)

Four task-based flagships + seven supporting sections (`src/lib/nav.ts`):

| Path | Label | Intent | `data-mcp-tool` |
|---|---|---|---|
| `/` | Showcase | Explore the live language | `showcaseSurface` |
| `/marketplace` | Marketplace | Acquire / install components | `marketplaceSurface` |
| `/catalog` | Catalog | Reference the full registry | `catalogSurface` |
| `/playground` | Playground | Experiment (lab + Intent DSL) | `playgroundSurface` |
| `/tokens` | Tokens | Token reference | `tokensSurface` |
| `/glass` | Glass Lab | Glassmorphism lab | `glassSurface` |
| `/brands` | Brands | Chameleon worlds | `brandsSurface` |
| `/recipes` | Recipes | Copy-paste library | `recipesSurface` |
| `/mcp` | MCP Console | Live MCP tools | `mcpConsoleSurface` |
| `/a11y` | Accessibility | Neuroinclusion | `a11ySurface` |
| `/icons` | Icons | Icon registry | `iconsSurface` |

Legacy `/components` redirects to `/catalog` (`src/App.tsx`). The shell (`src/App.tsx`) sets
`data-mcp-tool={mcpToolForPath(pathname)}` on `.portal-main` per route (`src/lib/mcpTools.ts`).

## §3 Shell & Component Tree

The portal uses the **office-suite shell**, byte-identical to `production/portals/workspace` and
`production/portals/mcp-marketplace` (`tokens.css`, `workspace.css`, `globals.css` shared). Sidebar is a
scroll container (`overflow-y: auto; min-height: 0`).

```
App (src/App.tsx) — BrowserRouter + AppShell (suite shell markup)
├── skip-link · AmbientStarfield
├── Topbar               src/components/Topbar.tsx   (crown-31 brand, center search ⌘K, badge + spoon-dial + avatar)
├── .app-body
│   ├── SidebarNav       src/components/SidebarNav.tsx   (11 nav-items from NAV_SECTIONS, emoji)
│   └── .main-workspace[data-mcp-tool]   ← scrollable; per-route attribute
│       └── Routes → Showcase/Marketplace/Catalog/Playground/Tokens/Glass/Brands/Recipes/MCP/A11y/Icons
├── MobileBottomNav      src/components/MobileBottomNav.tsx   (flagships)
├── CommandPalette       src/components/CommandPalette.tsx   (⌘K, suite modal)
└── CalmOverlay          src/components/CalmOverlay.tsx   (spoons 0)
```

CSS cascade layers (`src/index.css`): `base → legacy → vendors → suite → content`. `legacy` is a sunset
stopgap (old bespoke portal classes overridden to suite-card look in `content`).

## §4 Persistence & State

- `src/lib/useSpoonsStore.ts` — spoon level (0–5). Sets `data-spoons` on `<html>`/`<body>` and
  `--motion-scale` on `:root` (`src/App.tsx`). The canon spoon-ladder CSS drives blur/speed-factor.
- `src/lib/nav.ts` — `NAV_SECTIONS` (IA), `FLAGSHIP_PATHS`.
- design-core `theme-store` (persist key `p31-portal-theme`) — Chameleon world × age × sensory.

## §5 Dependencies & Vendored Canon

| Package | Version | Source | Role |
|---|---|---|---|
| `@p31ca/design-core` | 3.0.0 | `vendor/p31-design-core-3.0.0.tgz` | Tokens, compositions, genui catalog, MCP server |
| `@p31ca/ui` | 1.3.1 | `vendor/p31-ui-1.3.1.tgz` | Adaptive GreyRock + NeuroAdapter |
| react / react-dom | 19.x | npm | UI runtime |
| react-router-dom | 6.x | npm | Routing |

Vite chunks: `vendor-react`, `vendor-design-core`, `design-route` (`vite.config.ts`). Vendor integrity gate:
`pnpm v:gate` (fixed in 2026-09-24 — derives expected packages from `file:vendor/*.tgz` deps).

## §6 Deltas from the previous build

- **Token stance:** raw hex/rgba → OKLCH + `color-mix` (hue-270 neutrals + quantum accents). Canon
  `design-core` migrated to 3.0.0 with the same stance; `scripts/token-audit.mjs` is the hard gate.
- **IA:** Home/Components/etc. → four flagships (Showcase · Marketplace · Catalog · Playground) + supporting.
- **New surfaces:** Showcase (live stage + caregiver-gate demo), Marketplace (design shop of the 70-component
  genui catalog + MCP marketplace cross-link), Catalog (full genui registry with live previews), Playground
  (ComponentLab + Intent DSL tabs).
- **Agent integration:** `data-mcp-tool` per surface via `src/lib/mcpTools.ts`; `portalShell` on the shell.
- **Fix GAP-07:** `v-gate.mjs` no longer hardcodes `@p31ca/design-core` — it derives packages from the target
  manifest's `file:vendor` deps (unblocks both design + workspace portals).