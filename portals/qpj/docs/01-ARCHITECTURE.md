# 01 — Architecture

## Purpose

QPJ ("The Quantum Pickle Jar", sub-brand **Lantern**) replaces the five persona
portals (children, teen, meatspace, parent) plus chat/design with a single React
app whose privacy, tone, and capability scale with the person using it.

## Layout

```
production/portals/qpj/
├── index.html                     # html[data-brand="qpj" data-mode="spark" data-passport="dillpickle"]
├── pnpm-workspace.yaml            # shields from /home/p31 root workspace
├── vendor/                        # design-core 2.3.0 + p31-ui 1.3.1 tarballs (gated)
├── public/routes.json             # emitted by prebuild (emit-route-list.mjs)
├── scripts/emit-route-list.mjs    # prebuild: writes public/routes.json from src/lib/routes.ts
└── src/
    ├── main.tsx                   # design-core css (all -> container) then index.css
    ├── App.tsx                    # topbar, SpoonDial, AvatarMenu, Toast, ModeGuard'd routes, BottomNav
    ├── index.css                  # SINGLE stylesheet: token palette + components (no hex)
    ├── lib/{passports,routes,workers}.ts
    ├── machines/modeGate.ts
    ├── store/{useQpjStore,useAppStore}.ts # persisted authority + session toast shim (sandboxed studio)
    ├── hooks/{useHashRoute,useModeEffects,useSimulatedPresence,MeshBridge}.tsx
    ├── voice/{useVoice,support}.ts
    ├── components/{VoiceButton,BatteryRing,BottomNav,AvatarMenu,Toast,Confetti,PinDialog,ModeGuard}.tsx
    ├── features/sandbox/                  # sandboxed artifact studio (lifted from the chat portal, workspace-shielded)
    ├── pages/StreetPage.tsx            # family surfaces (street/talk/you/craft/switch)
    ├── pages/workshop/                 # PIN-gated builder home (workbench absorbed from design portal)
    │   ├── WorkshopPage.tsx            # tabs hub + #/workshop/{tab} sub-routing
    │   ├── Studio.tsx                    # Studio tab: sandboxed artifact studio (chat + offline composer)
    │   ├── TokenExplorer.tsx           # TOKEN_MAP explorer (@p31ca/design-core/mcp/data)
    │   ├── RecipeBrowser.tsx           # RECIPE_MAP/NAMES/CATEGORIES browser
    │   ├── ComponentCatalog.tsx        # live @p31/design-core/compositions gallery
    │   ├── Playground.tsx              # Intent DSL → parseIntent + runQaGates (in-browser)
    │   ├── Brands.tsx                  # resolveBrandTokens live re-paint (no localStorage)
    │   ├── ApcaChecker.tsx + apca.ts   # pure APCA 0.98G contrast tool
    │   └── workshop.css + studio.css # token-only styles (no hex); studio.css sandcastled from the chat portal, reviewed
    └── pages/{Talk,You,Craft,Switch}Page.tsx
```

## Design intent

- **Warm over techy**: OKLCH cream surfaces, lantern ambers, per-passport accent hue
  (`html[data-hue]`), nickname-first copy. `data-mode` deepens ink for maker/workshop.
- **Energy literacy**: spoons (0–5) are the shared currency; `BatteryRing` renders
  them, `--p31-spoon-level` drives calibration, low-spoon visuals calm motion.
- **Mesh under the hood**: presence + messaging travel a p2p HeartbeatMesh bound to
  `qpj:{passportId}:{room}`; it is simulation-fallback first, real mesh when online
  (`MeshBridge` sets `html[data-mesh]`).
- **Progressive disclosure is enforced at the route boundary** (`docs/04-MODES.md`).
  The `/workshop` builder home (tokens/recipes/catalog/Intent-gates/brands/contrast)
  requires `workshop` mode and is PIN-gated; sub-routes `#/workshop/{tab}` normalize
  to the parent so the guard wraps all of them.
- **Sandboxed studio is browser-safe**: `Studio` (the chat AI artifact studio)
  was lifted from the chat portal and stripped of every cross-portal dependency —
  `lib/workers.ts` configures the worker endpoints via env, `localCompose` builds
  token-faithful HTML in-browser when the generator is unreachable, and the whole
  tree passes `pnpm typecheck && pnpm lint && pnpm test && pnpm build` together
  with qpj (no new deps besides the studio's viewers).
- **Design-core viewers are lifted, not forked**: workshop tabs read the same
  vendored 2.3.0 tarball subpaths the design portal uses (`/mcp/data`, `/tokens`,
  `/agentic`, `/theming/theme-store`, `/compositions`) — never the root export
  (node:fs), never new deps.

## Runtime gate

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm v:gate
```

## Why hash routing

No react-router dep: `useHashRoute` normalizes `#/street…` and `navigateTo` swaps
state. Simpler for a one-page family shell and avoids server rewrite config on Pages.