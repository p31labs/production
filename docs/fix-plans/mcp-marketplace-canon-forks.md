<!-- P31-HEADER
id: p31_fix_plan_mcp_marketplace_canon_forks_20261011_v1.0
type: fix-plan
component: portals/mcp-marketplace
status: resolved
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

# fix-plan: mcp-marketplace-canon-forks

**Discovered by:** agent:subagent:marketplace-frontend-upgrade (W-session)
**Discovered at:** 2026-10-11T00:00:00Z
**Severity:** high (blocks portal deploy)

## The bug

The Vite 7 deploy (`node scripts/deploy.mjs`) was refused by the
canon-fork gate (`tools/canon-audit/canon-source-audit.mjs`). The gate scans
the whole production tree and reports **47 forks**; **9 of them are in
mcp-marketplace** and are pre-existing (this workstream touched only
tooling files — package.json, vite.config.ts, vendor tarball removal):

- 8 component-duplicates in `portals/mcp-marketplace/src/components/`
  (canon already ships each in `@p31ca/design-core/compositions`):
  `CalmOverlay.tsx`, `CommandPalette.tsx`, `IdentityChip.tsx`,
  `MobileBottomNav.tsx`, `NotificationStack.tsx`, `SidebarNav.tsx`,
  `Starfield.tsx`, `Topbar.tsx`
- 1 token-fork: `portals/mcp-marketplace/src/tokens.css` re-defines 47
  non-adapter `--p31-*` tokens (54 total) instead of importing from
  `@p31ca/design-core` (SSOT).

The other ~38 forks live in other portals (chat, children, design,
env-portal, forge, meatspace, …) — outside this workstream's zone, but they
share the same repo-wide gate, so even after mcp-marketplace is clean the
deploy script's unscoped `canon-source-audit` invocation keeps failing until
those zones are resolved too.

## The fix

1. Replace the 8 local components with imports from
   `@p31ca/design-core/compositions` (consume-don't-fork; Seven Laws #2/#4).
   Any portal-specific wrapper logic (hash routing, zustand wiring) moves into
   the feature layer — never a canon duplicate.
2. Replace `src/tokens.css` re-definitions with the canon
   `@p31ca/canon/tokens.css` import (SSOT), or reduce the file to pure adapter
   declarations (values must reference a different canon token via
   `var(--p31-…)`).
3. Verify with `node tools/canon-audit/canon-source-audit.mjs --target
   portals/mcp-marketplace` before re-running the deploy.

## The gate

`node scripts/deploy.mjs` passes the canon-fork gate for mcp-marketplace
(after 1+2, `--target portals/mcp-marketplace` reports 0 forks). Full repo
green still depends on the other portals' forks being filed/resolved.

## Resolution (2026-10-11)

**Resolved by:** agent:subagent:canon-fork-remediation
**Result:** `canon-source-audit --target portals/mcp-marketplace` → 9 forks → **0 forks**. Deployed live.

### Component swap table (local → canon `@p31ca/design-core/compositions`)

| Local file | Canon | Wrapper needed | Portal adaptation kept in wrapper |
|---|---|---|---|
| `CalmOverlay.tsx` | `CalmOverlay` | yes (store→props) | `crisis` flag ⇔ `spoons: 0`; `onExit` → `setCalm(false)`. Canon drives `data-calm` on `<html>`; the old full-screen overlay is gone (accepted shift). |
| `CommandPalette.tsx` | `CommandPalette` | yes | `paletteOpen`/`closePalette` store; `ROUTES` → `CommandItem[]`; `onSelect` → mode-gated `navigate`. |
| `IdentityChip.tsx` | `IdentityChip` | yes | active member + `identities` store; `onClaim` mints did:key (portal crypto machinery). |
| `MobileBottomNav.tsx` | `MobileBottomNav` | yes | portal route set (`SidebarNavItem[]`, flagship), `activePath` = surface, `onNavigate` gated. |
| `NotificationStack.tsx` | `NotificationStack` | yes | `useNotifStore` → props; auto-dismiss timers use canon `NOTIFICATION_DURATION`. |
| `SidebarNav.tsx` | `SidebarNav` | yes | routes → items; maker-lock badge via canon `renderItem` extension point. |
| `Starfield.tsx` | `Starfield` | yes | `spoons`/`safeMode` from store; geometry-only `starfield.css` class kept. (Canon derives particle config — the old count/seed/flare settings become no-ops; accepted.) |
| `Topbar.tsx` | `Topbar` | yes | slots filled with canon: `CommandTrigger` (center), `ModePill` (mode), `SpoonDial` min=1 + Calm (trailing), `IdentityChip` (identity), portal wordmark (brand), role chip (statusCluster). |

### Token migration

- `src/tokens.css` reduced from 47 non-adapter redefinitions to **23 adapter
  declarations only** — every value aliases a different canon token via
  `var(--p31-…)` (R1-compliant).
- `src/main.tsx` now imports `@p31ca/canon/tokens.css` +
  `@p31ca/design-core/css/index.css` JS-side, before the portal sheets
  (accepted pattern from design-core-tokens-css-consumer-migration.md).
- Token-resolution check: every `var(--p31-*)` in portal CSS/TSX resolves to a
  canon token or a declared adapter; the only exception is the dynamic
  `--p31-accent-${resolved.accent}` composed at runtime by
  `useThemeEffects.ts` from canon accent names (cyan/violet/gold/green/red/iris).

### Vendor refresh (was stale 3.0.0 → 3.0.1)

- `pnpm sync:vendor` repacked `p31-design-core-3.0.1.tgz` (the 3.0.0 snapshot
  lacked 5 of the 8 canon compositions) and added `p31ca-canon-0.2.0.tgz`.
- `package.json`: `@p31ca/design-core` → `file:vendor/p31-design-core-3.0.1.tgz`,
  added `@p31ca/canon` → `file:vendor/p31ca-canon-0.2.0.tgz`. `pnpm install`
  re-linked; `v:gate` PASS (5 packages).
- Portal CSS: fork-styling for the replaced chrome removed from
  `workspace.css` (topbar/spoon/palette/calm/notif blocks) and
  `marketplace.css` (mobile fork rules); canon classes (`cmdk-*`,
  `notif-*`, `spoon-*`, `.starfield-bg`) get design-core CSS; unstyled canon
  classes (`sidebar-nav*`, `mobile-bottom-nav*`, `identity-chip`,
  `command-trigger*`, `mode-pill*`, topbar slot geometry) get portal rules
  retargeted to the canon names.

### Deploy gate scoping

`scripts/deploy.mjs` now runs the audit scoped to the portal
(`--target <portalRoot>`) — the repo-wide scan stays with the root
`pnpm gate`; other portals' filed forks no longer block this portal's deploy
(this plan's "The gate" section).

### Gate results + deploy

- `pnpm gate` (typecheck / lint / test 7/7 / build / v:gate) — all green.
- `canon-source-audit --target portals/mcp-marketplace` — **0 forks**
  (was 9). No forks beyond the listed 9 were found.
- `node scripts/deploy.mjs` → deployed to `p31-portal-mcp-marketplace`:
  preview `https://1d7b6f0f.p31-portal-mcp-marketplace.pages.dev`,
  production `https://p31-portal-mcp-marketplace.pages.dev` — both HTTP 200
  and serving the new hashed assets (`index-DnnyQWfp.js`,
  `index-ztYDnpIL.css`, `starfield-CGT6m8nj.js`) with canon classes in the
  served CSS.