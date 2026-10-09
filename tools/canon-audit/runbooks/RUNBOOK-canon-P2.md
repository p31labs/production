# RUNBOOK-canon-P2 — Promote 4 chrome components into the canon

**Purpose:** Add `SidebarNav`, `MobileBottomNav`, `CalmOverlay`, `NotificationStack`
to `@p31ca/design-core/compositions/` — props-driven, store-agnostic, token-clean.
**Owner:** design-core maintainer. **Depends on:** nothing. **Blocking for:** P5, P6, P7.

## Steps

1. Confirm absence (they are not in the canon today):
   ```
   ls packages/design-core/src/compositions/ | grep -iE "sidebar|mobile|calm|notif"
   ```

2. Read the design portal reference implementations:
   ```
   cat production/portals/design/src/components/{CalmOverlay,SidebarNav,MobileBottomNav,NotificationStack}.tsx
   ```

3. Write each canon version **store-agnostic** (props, not portal stores):
   - `SidebarNav.tsx`: `<SidebarNav items={NavItem[]} activePath={string} onNavigate={fn}/>`
   - `MobileBottomNav.tsx`: same items contract
   - `CalmOverlay.tsx`: `<CalmOverlay spoons={number} onReturn={fn}/>` — NO inline `style={{fontSize:36}}`
   - `NotificationStack.tsx`: `<NotificationStack items={Notification[]} onDismiss={fn}/>`

4. Append token-driven CSS to `src/css/chrome.css` (`.sidebar-nav`, `.mobile-bottom-nav`,
   `.calm-overlay`, `.notification-stack`).

5. Export from `src/compositions/index.ts`:
   ```
   export { SidebarNav, type NavItem } from './SidebarNav';
   export { MobileBottomNav } from './MobileBottomNav';
   export { CalmOverlay } from './CalmOverlay';
   export { NotificationStack, type Notification } from './NotificationStack';
   ```

6. Regenerate stories/tests via the generator:
   ```
   npx tsx scripts/generate-components.ts --from src/compositions/SidebarNav.tsx --emit test,story
   ```

7. Build + verify:
   ```
   cd packages/design-core && pnpm build && pnpm typecheck && pnpm test
   node scripts/token-audit.mjs && node scripts/canon-purity.mjs
   ```

## Gate
```
node -e "const m=require('./dist/compositions/index.js');
  ['SidebarNav','MobileBottomNav','CalmOverlay','NotificationStack'].forEach(
    n=>{if(!m[n])process.exit(1)}); console.log('PASS: 4 chrome exports present')"
node scripts/token-audit.mjs && echo "PASS: no raw hex"
```

## Negative control
A component with an inline non-prop hex style fails token-audit:
```
echo 'export const Bad=()=> <div style={{color:"#ff0000"}}/>' > src/compositions/__nc__.tsx
node scripts/token-audit.mjs | grep -q "raw hex" && echo "NC PASS"; rm src/compositions/__nc__.tsx
```

## Rollback
```
git checkout HEAD -- packages/design-core/src/compositions/ packages/design-core/src/css/chrome.css
```