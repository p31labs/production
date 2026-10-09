# RUNBOOK-canon-P6 — Migrate the design portal chrome

**Purpose:** `design.p31ca.org` consumes `@p31ca/design-core/compositions/` for all
chrome. No hand-rolled Topbar/SidebarNav/CalmOverlay/etc. **Owner:** portal
maintainer. **Depends on:** P2, P3. **Blocking for:** P8, P9.

## Steps (Design System Unification six-step, per-component)

For each of `Topbar`, `CommandPalette` (canon exists) and the promoted
`SidebarNav`, `MobileBottomNav`, `CalmOverlay`, `NotificationStack` (P2):

1. **Inventory** — find consumers:
   ```
   grep -rl "from.*components/<Name>" production/portals/design/src/
   ```
2. **Dependency** — `@p31ca/design-core` already in package.json (confirm).
3. **Barrel redirect** — replace the file's contents with a re-export:
   ```tsx
   export { Topbar } from '@p31ca/design-core/compositions/Topbar';
   ```
   (keeps every import working mid-migration)
4. **Stories** — point Ladle stories at the canon component.
5. **Visual verification** — run the parity gate BEFORE deleting:
   ```
   node tools/design-parity/visual-gate.mjs --candidate http://localhost:5180 --skip-screenshot
   # must pass; pixel ratios unchanged vs pre-migration baseline
   ```
6. **Delete** the hand-rolled file once the redirect shows no visual change;
   update call sites to import directly from `@p31ca/design-core/compositions/`.

For the promoted components, pass portal config as props (nav items, spoons, onReturn).

## Gate
```
node tools/canon-audit/canon-source-audit.mjs 2>&1 | grep -c "production/portals/design" | grep -q "^0$" && echo PASS
cd production/portals/design && pnpm test:acceptance
node /home/p31/production/tools/design-parity/visual-gate.mjs --candidate http://localhost:5180
```

## Negative control
A scratch `src/__nc__fork.css` with `--p31-accent` fails the fork gate.

## Rollback
```
git checkout HEAD -- production/portals/design/src/components/
```