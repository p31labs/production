<!-- P31-HEADER
id: canon_fork_migration_backlog_20261013_v1.0
type: fix-plan
component: production (tree-wide)
status: active
created: 2026-10-13T02:20:00Z
owner: agent
-->

# Fix plan — canon-fork migration backlog (tree-wide)

## Background
`tools/canon-audit/canon-source-audit.mjs` (R1 token-forks, R2 component
duplicates) reports **30 forks** across the production tree. None are in
`portals/workspace` or `apps/willow` — both were migrated in-place on
2026-10-13 (see `willow-forks-canon-audit.md`). This plan files the rest.

## Established precedent (already followed)
- `portals/design/scripts/deploy-precheck.mjs` — the reference pattern:
  `--target <portal>/src --allow <filed-fork-files>` while migration proceeds
  (its own `tokens.css`, `ambient.css`, `Topbar.tsx` are allowlisted).
- `portals/forge/scripts/gate.mjs` — `--target` scoped, zero allowances.
- `portals/workspace/scripts/deploy.mjs` — now `--target` scoped with a single
  filed allowance (`src/tokens.css`), mirroring design.

## Remaining fork surface (30, grouped)
- **Token layers to migrate to adapters** (values must become `var(--p31-…)`
  references to canon tokens, or the definitions deleted where canon owns the
  name): portals/chat, children, design (`tokens.css`), env-portal,
  meatspace, parent (and any others in the current audit output).
- **Component duplicates to convert to consumer wrappers** (same-name canon
  import + re-compose, per R2's consumer exception):
  - apps/music-maker `Starfield`, apps/phos `GlassCard`/`StatusBadge`,
    apps/tetra-ops `Footer`
  - portals/design `Topbar`, forge `Topbar`/`Identity.stories` `EmptyState`,
    qpj `BottomNav`/`CrisisOverlay`/`NotificationStack`/`Starfield`,
    shell `CommandPalette`
- Workspace's own `src/tokens.css` (47 legacy surface tokens) is allowlisted
  in its deploy; migrate it to an adapter layer referencing canon token names
  once the canon token coverage in `packages/canon/dist/tokens.css` (338
  names) is confirmed loaded in the portal bundle.

## Execution notes
- Each portal's deploy gate runs the audit tree-wide unless it passes
  `--target`; as each portal is migrated, its deploy script should scope the
  audit to its own `src` (same one-line change as workspace's).
- The wrapper pattern is mechanical: keep the portal prop surface, import the
  canon composition, re-compose portal content through slots/renderItem/
  children. Where a canon component lacks a portal feature (e.g. workspace
  starfield flare layer), the portal keeps a thin extension layer — that is
  composition, not a fork, and belongs in the portal, not in canon.

## Verification
- `node tools/canon-audit/canon-source-audit.mjs` → 0 forks.
- Per-portal deploy prechecks green.