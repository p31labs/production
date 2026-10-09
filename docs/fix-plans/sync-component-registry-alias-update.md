<!-- P31-HEADER
id: p31_fix_plan_alias_update_20261004_v1.0
type: fix-plan
component: scripts
status: open
retention: archive-90d
created: 2026-10-04T00:00:00Z
owner: will
-->

# fix-plan: sync-component-registry-alias-update

**Discovered by:** agent:worker:W6-session
**Discovered at:** 2026-10-04T00:00:00Z
**Severity:** medium

## The bug

`scripts/sync-component-registry.mjs:193` contains an unfiled `TODO: Implement
alias update logic`. When `--update-aliases` is passed and no missing tokens
exist, the script reports success but never actually applies the alias
suggestions — the update path is a no-op behind an unimplemented TODO.

## The fix

Implement the `updateAliases` branch: read the alias suggestions from the
registry, write them back to the component manifest, and log the applied
aliases. When `dryRun` is set, print the would-be aliases instead.

## The gate

`node scripts/sync-component-registry.mjs --update-aliases --dry-run` prints the
aliases to apply; the actual run mutates the manifest and reports the applied
count. The fix-plan-scan passes because the TODO is now resolved.