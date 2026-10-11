<!-- P31-HEADER
id: p31_fix_plan_alias_update_20261004_v1.0
type: fix-plan
component: scripts
status: resolved
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

## Resolution (2026-10-11)

Implemented the `updateAliases` branch and removed the `TODO` marker.

**Two bugs, not one.** Besides the no-op TODO, the documented invocation was
broken: `dsPath = process.argv[2]` treated the first flag as the design-system
path, so `--update-aliases --dry-run` died with
`ENOENT: ... open '--update-aliases'` (the failure observed in the W6 session).

**Fix:**
1. Argument parsing now separates flags from the positional path:
   `const dsPath = args.find((a) => !a.startsWith('--')) || DEFAULT_DS_PATH;`
2. `applyAliasUpdates(suggestions, { dryRun })` implemented:
   - `dryRun` prints the `token -> canonical-css-var` map, writes nothing;
   - a real run merges the alias map into the component manifest
     (`portals/shell/docs/components.manifest.json`) under `token_aliases`
     (additive, so re-runs converge) and reports the applied count;
   - with zero suggestions it reports "nothing to apply" instead of silently
     exiting — the previous silent no-op.

**Verification:**
- `node scripts/sync-component-registry.mjs --update-aliases --dry-run` → parses
  flags correctly, reports `0` aliases (registry is fully synced).
- Dry-run against a throwaway empty design-system → lists the 16 alias mappings,
  writes nothing.
- Real run against the same input → applied 16 aliases to the manifest and
  reported the count; manifest restored byte-identical afterwards (no residue).
- `node scripts/fix-plan-scan.mjs` → no ownership violations.

**Note:** with the registry fully synced (0 missing, 0 suggestions) the update
path is a no-op in *content* but no longer a no-op in *behavior* — it reports the
zero case honestly and applies correctly whenever a suggestion exists.