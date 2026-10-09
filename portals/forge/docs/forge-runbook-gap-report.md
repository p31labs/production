# Forge Runbook Gap Report (FORGE-AGENTS-001 v1.0.0)

Verified against disk 2026-09-30. Sections below resolve to evidence.

## 1. Commands (§15) — resolution check

| Command | Resolves | Note |
|---|---|---|
| `tools/design-parity/layout-invariants.mjs` | YES | lacks `--routes` support (hardcodes `/`) — see gap G-4 |
| `tools/design-parity/visual-assert.mjs` | YES | |
| `tools/design-parity/sierpinski-audit.mjs --probe` | YES | |
| `tools/canon-audit/canon-source-audit.mjs` | YES | NC at `nc/canon-source-audit-nc.mjs` present |
| `packages/design-core/scripts/token-audit.mjs` | YES | |
| `packages/design-core/scripts/canon-purity.mjs` | YES | |
| `canon-audit/runbooks/RUNBOOK-canon-P7.md` | YES | referenced by gates.json remediation |

## 2. Gates (§2.3 / §7.1) — registry vs disk

| Gate | gates.json | Wired in gate.mjs | Wired in deploy-precheck | NC present |
|---|---|---|---|---|
| token-audit | BLOCKING | (via system-test) | (via system-test) | YES |
| system-test | BLOCKING | YES | YES | YES |
| visual-gate | BLOCKING | NO | YES | YES |
| canon-source-audit | BLOCKING | NO | NO | YES |
| **layout-invariants** | **MISSING** | **MISSING** | **MISSING** | **MISSING** |
| **snapshots:guarded** | **MISSING** | — (script-level) | — | — |

Gap G-1: `layout-invariants` not registered; no NC. Gap G-2: `snapshots:guarded` no script.
Gap G-3: `visual-gate` and `canon-source-audit` are registered in gates.json but NOT run by
`gate.mjs`/`deploy-precheck.mjs` (canon-source-audit not in deploy-precheck).

## 3. Fork inventory (§2.2) — verified

| Component | State |
|---|---|
| `tokens.css` | **Migrated** — pure `@import '@p31ca/design-core/css/index.css'` + adapter aliases (no raw values) |
| `CalmOverlay.tsx` | **Fork** — hand-rolled (exports CalmOverlay, canon ships it) |
| `MobileBottomNav.tsx` | **Fork** — hand-rolled |
| `SidebarNav.tsx` | **Fork** — hand-rolled (NavLink-based) |
| `Topbar.tsx` | **Fork** — hand-rolled (grandfathered in gates.json `--allow`) |

Correction-on-record confirmed: Forge Topbar was NOT migrated (design portal claim only).

## 4. Vendored canon staleness (§5)

Gap G-5 (BLOCKER): `forge/vendor/p31-design-core-3.0.0.tgz`
`a4fea8df5ca5c451e387a3ac8bcc52f1` != workspace pack `608e69c66520d05ed6854124cf986402`.
Extracted `node_modules/@p31ca/design-core/src/compositions/` has 25 files and LACKS the
P2-promoted chrome (CalmOverlay, MobileBottomNav, SidebarNav, NotificationStack,
CalmIndicator, CommandTrigger, ModePill, SpoonCluster, StatusCluster, TopbarSection) that
the workspace canon (35 files) exports. Forge cannot migrate until refreshed.

## 5. Rollback hazard (§13)

Gap G-6: forge is NOT its own git repo — root is `/home/p31/production`; the runbook's
`git checkout src/components/<Name>.tsx` paths are wrong (must be
`production/portals/forge/...` from the production root) AND the working tree already has
uncommitted modifications to the target files, so `git checkout` would restore an arbitrary
HEAD state, not the pre-migration state. Session uses `/tmp/forge-rollback/` backups.

## 6. Gate fires now (§7.3 negative controls)

`nc/canon-source-audit-nc.mjs` and the forge NC fixtures exist. NC validation is run in
Phase 2d (`pnpm gate:self-test`).

---
Resolution: G-1/G-2 wired in Phase 2; G-5 refreshed in Phase 1; G-6 mitigated by session
backups; G-3 (canon-source-audit in deploy-precheck) folded into Phase 2b; G-4 fixed in Phase 2a.