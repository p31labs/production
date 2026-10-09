# RUNBOOK-canon-P7 — Migrate the forge chrome

**Purpose:** The forge consumes `@p31ca/design-core/compositions/` for all chrome.
The forge's `src/tokens.css` (currently an adapter) becomes an import; its
hand-rolled `Topbar`/`SidebarNav`/`CalmOverlay`/etc. become canon imports.
**Owner:** forge maintainer. **Depends on:** P2, P3. **Blocking for:** P8, P9.

## Steps

Same six-step as P6, per component: `Topbar`, `SidebarNav`, `MobileBottomNav`,
`CalmOverlay`, `CommandPalette`, `NotificationStack`.

The forge's chrome consumes `useUI` (world/mode/spoons) — pass as props at the
call site in `App.tsx` (the canon components are store-agnostic).

After the chrome swap, convert `src/tokens.css` from the adapter to a pure import:
```css
@import '@p31ca/design-core/css/index.css';
```
(Remove the legacy fork-name aliases once `globals.css`/`playground.css` are
migrated to canon names.)

## Gate
```
node tools/canon-audit/canon-source-audit.mjs 2>&1 | grep -c "production/portals/forge" | grep -q "^0$" && echo PASS
cd production/portals/forge && pnpm typecheck && pnpm test && pnpm build
node /home/p31/production/tools/design-parity/visual-gate.mjs --candidate http://localhost:5180
node /home/p31/production/tools/design-parity/visual-gate.mjs --candidate https://p31-portal-forge.pages.dev --skip-screenshot
```

## Negative control
A scratch `src/__nc__fork.css` with `--p31-accent` fails the fork gate.

## Rollback
```
cd production/portals/forge && git checkout HEAD -- src/components/ src/tokens.css
```

## Note
The forge gate registry currently `--allow`s `src/tokens.css` + `src/components/Topbar.tsx`
(migration-in-progress). **Remove those `--allow` entries** before P9 declares convergence.