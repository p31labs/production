# RUNBOOK-canon-P3 — Install the fork-detection gate

**Purpose:** `canon-source-audit` fails any portal/app that re-defines `--p31-*`
tokens or duplicates a canon compositions export. **Owner:** gate steward.
**Depends on:** nothing. **Blocking for:** P6, P7, P8.

## Steps

1. The gate exists at `tools/canon-audit/canon-source-audit.mjs` (built 2026-09-30).
   Baseline: **37 forks** fleet-wide. Confirm:
   ```
   node tools/canon-audit/canon-source-audit.mjs 2>&1 | tail -1
   # → ✗ FAILED — 37 fork(s) detected
   ```

2. The negative control exists at `tools/canon-audit/nc/canon-source-audit-nc.mjs`.
   Confirm it can fail:
   ```
   node tools/canon-audit/nc/canon-source-audit-nc.mjs
   # → NEGATIVE_CONTROL_OK
   ```

3. Wire into each portal's gate registry (`tests/acceptance/gates.json`) as BLOCKING
   with the shared NC. The `command` may carry `--allow <file>` for migration-in-progress
   files (each path removes its `--allow` before P9).

4. Wire the same NC into the gate meta-test (`gate-self-test.mjs` discovers
   `negative-controls/<gate-id>.mjs` — add a wrapper if needed).

5. Add Nx `enforce-module-boundaries` depConstraints (or the workspace's equivalent):
   ```json
   { "depConstraints": [
     { "sourceTag": "scope:canon",  "onlyDependOnLibsWithTags": ["scope:canon"] },
     { "sourceTag": "scope:portal", "onlyDependOnLibsWithTags": ["scope:canon"] },
     { "sourceTag": "scope:app",    "onlyDependOnLibsWithTags": ["scope:canon"] } ] }
   ```
   Tag `packages/design-core` = `scope:canon`; `production/portals/*` = `scope:portal`;
   `apps/*` = `scope:app`.

## Gate
```
node tools/canon-audit/nc/canon-source-audit-nc.mjs | grep -q NEGATIVE_CONTROL_OK && echo PASS
node tools/canon-audit/canon-source-audit.mjs 2>&1 | grep -c "fork"   # baseline count recorded
```

## Negative control
The NC proves the gate can fail (a scratch `--p31-accent` + duplicate `Topbar` → exit 1).

## Rollback
```
rm -rf tools/canon-audit/
git checkout HEAD -- <gate registries> nx.json
```