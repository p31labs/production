# fix: pnpm -r publish over-published 4 unscoped apps/workers; add a pre-publish guard

<!-- P31-HEADER
id: p31_fix_plan_publish_over_published_unscoped_20261010_v1.0
type: fix-plan
component: workspace
status: open
retention: keep-forever
created: 2026-10-10T00:00:00Z
owner: will
-->

## Symptom

The canon 0.2.0 release (`pnpm -r publish --access public --no-git-checks`)
published 8 intended `@p31ca/*` packages **and 4 unintended unscoped packages**
that are apps/workers, not libraries:

| Package | Source | Version |
|---|---|---|
| `planetary-planet` | `apps/phosphorus31/package.json` | 0.0.1 |
| `p31ca` (unscoped!) | `apps/p31ca/package.json` | 0.0.1 |
| `epcp-command-center-tests` | `workers/command-center/package.json` | 1.0.0 |
| `p31-social-worker` | `workers/social-drop-automation/package.json` | 2.0.0 |

`pnpm -r publish` publishes every workspace package with an unpublished version
and no `private` guard. These four kept unscoped non-`@p31ca` names and no
`private: true` after the `@p31` → `@p31ca` migration, so they shipped to npm
under names that either collide with the scope (`p31ca`) or are codenames
(`planetary-planet`).

## Evidence

- `npm view planetary-planet` → 0.0.1, `p31ca` → 0.0.1 (unscoped, owned by
  classicwilly).
- All four `package.json` had `"name": "<unscoped>"` with no `private` field.

## Fix (applied)

1. Marked all four `private: true` (they are apps/workers, not publishable
   libraries).
2. `pnpm deprecate`d all four (unpublish returned 403 — npm's publish-protection
   policy; deprecation is the recoverable signal).
3. Add a **pre-publish guard**: fail `pnpm -r publish` if any non-`@p31ca/`
   package is non-private. (See below — not yet implemented.)

## Remaining

Add `scripts/check-publish-surface.mjs`: walk `packages apps workers portals
monetization`, fail if any `name` does not start with `@p31ca/` and is not
`private`. Wire into the root `gate`. (Implemented 2026-10-10.)

## Impact

- Four orphaned unscoped names now sit deprecated on npm. They cannot be
  unpublished (403) — same class as the lost original npm scope: resolvable, not
  removable.
- Any future `pnpm -r publish` without the guard re-exposes this class of bug.