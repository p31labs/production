# fix: pnpm -r publish over-published 4 unscoped apps/workers; add a pre-publish guard

<!-- P31-HEADER
id: p31_fix_plan_publish_over_published_unscoped_20261010_v1.0
type: fix-plan
component: workspace
status: resolved
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
2. `pnpm deprecate`d all four. Unpublish 403'd — see "Root cause of the 403"
   below; deprecation is the recoverable signal.
3. Added `scripts/check-publish-surface.mjs` — a pre-publish guard that derives
   the publish surface from `pnpm-workspace.yaml` (self-syncing) and fails on any
   non-private package not scoped `@p31ca/`. Wired into `pnpm gate` AND the new
   `publish:release` script (which runs the guard + scope gate + full gate before
   `pnpm -r publish`). Negative control verified (`tools/__pubctrl` → exit 1).

## Root cause of the unpublish 403

`npm unpublish` and `pnpm unpublish` both returned 403 `Forbidden`, and
`npm profile get` returned the same. The registry notice explains it:

> npm tokens that bypass 2FA are being restricted for account changes and
> direct publishing. Learn how to prepare: https://gh.io/npm-gat-bypass2fa-deprecation

The `classicwilly` account authenticates with a **2FA-bypassing automation
token** (granular access token). npm now blocks such tokens from *account
changes* (`profile get`, `unpublish`) while still allowing *package writes*
(`publish`, `deprecate`). That is why deprecation succeeded but unpublish did
not — it is a token-permission policy, **not** the 72-hour window or a
downloads limit.

**Release-workflow risk:** the same notice says these tokens are also being
restricted for **direct publishing**. When that lands, the current token will
stop being able to `pnpm publish` at all. Before the next release, re-auth with a
2FA-bound token (`npm login` interactively with 2FA, or a token with TFA mode
`auth-and-writes`), or migrate to OIDC / trusted publishing.

## Remaining

Resolved 2026-10-10: re-authenticated `classicwilly` with 2FA (`auth-and-writes`),
unpublished all four. npm now holds the names as `0.0.0-stage` placeholders
("Temporary package placeholder for staged publishing") — the real versions are
gone and the names (notably `p31ca`) are reserved against squatting. Both open
items closed: the token migration and the unpublish.

## Impact

- Four orphaned unscoped names now sit deprecated on npm (resolvable, not
  removable without a 2FA-bound token).
- The guard + `publish:release` make a bare `pnpm -r publish` impossible to run
  without first passing the publish-surface and scope checks.

## Outcome (final)

- All four accidental versions (`planetary-planet@0.0.1`, `p31ca@0.0.1`,
  `epcp-command-center-tests@1.0.0`, `p31-social-worker@2.0.0`) removed.
- `npm view <name>` returns `0.0.0-stage` (npm name-reservation placeholder).
- Account 2FA is `auth-and-writes`; the 2FA-bypass token is no longer the
  release path. `publish:release` runs guard → scope → full gate → publish.