<!-- P31-HEADER
id: p31_fix_plan_canon_v2_legacy_portal_manifest_sync_20261012_v1.0
type: fix-plan
component: portals/shell
status: open
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

# fix-plan: sync the legacy portal component manifest with canon v2

**Discovered by:** agent:subagent:canon-v2 (the vessel-contract build)
**Discovered at:** 2026-10-12T00:00:00Z
**Severity:** medium (agent-facing contract drift, not a runtime bug)

## The bug

The live machine-readable component manifest
(`portals/shell/docs/components.manifest.json`, version 1.0.0) predates the
canon v2 wave and contradicts the canon's real surface:

1. It lists only 11 components (GlassPanel, GlassCard, Button, StatusBadge,
   MetricBadge, SidebarNav, SpoonDial, Starfield, NotificationStack,
   Chameleon, CrisisOverlay, CommandPalette) — the 40+ components that exist
   in `@p31ca/design-core` (Card, PageHeader, Tabs, Field, Shell, …) are
   absent, so agents composing from the manifest cannot see them.
2. It has no `Card` entry, although the surface spec references `Card` as a
   first-class surface (`packages/design-core/src/componentDefs.ts` has
   shipped `Card` at tier `core` since v2.2.0).
3. It has no forbidden list, so raw `<select>/<input>/<textarea>`, legacy
   class names, unlayered CSS, and hex literals outside tokens are all
   unenforced for manifest-driven agents.

## Why it was not fixed in place

The canon v2 workstream is scope-locked to `packages/canon/**`,
`packages/design-core/**`, `docs/enterprise/design-system/**`, and new
fix-plans. `portals/shell/docs/` is out of scope for that wave. The
reconciled canon v2 manifest now lives at
`packages/design-core/components.manifest.json` (v2.0.0).

## Portal port wave status (2026-10-12, marketplace port)

- **mcp-marketplace has NO local components manifest** — the portal-side
  sync item of the port is a no-op for this face. The marketplace portal
  consumes the manifest that ships inside the vendored
  `@p31ca/design-core` tarball (`packages/design-core/components.manifest.json`,
  re-packed by `pnpm sync:vendor`), which IS the v2 manifest.
- `portals/shell/docs/components.manifest.json` remains the stale v1 copy;
  it is **out of scope for the marketplace port task** (scope lock:
  `portals/mcp-marketplace/**` + `docs/fix-plans/` only) and stays open for
  the shell port wave.

## The fix (unchanged — shell port wave)

1. Copy `packages/design-core/components.manifest.json` over the portal copy.
2. Keep the portal copy's portal-specific composition rules (the shell owns
   geometry, canon owns appearance) — the v2 manifest already carries them.
3. Re-point any script that reads the portal path
   (`scripts/sync-component-registry.mjs` reads
   `portals/shell/docs/components.manifest.json`) at the new canonical file
   so the two can never drift again.