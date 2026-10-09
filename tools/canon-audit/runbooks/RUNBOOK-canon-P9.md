# RUNBOOK-canon-P9 — Convergence

**Purpose:** Verify the whole migration landed: one canon, zero forks, one query
surface. **Owner:** orchestrator. **Depends on:** P5, P6, P7, P8.

## Steps

1. Run every gate:
   ```
   node tools/canon-audit/canon-source-audit.mjs              # must be 0 forks
   node packages/govern/dist/cli.js validate packages/govern/domains/design/constitution.json
   node tools/system-test/run.mjs
   node tools/system-test/negative-controls/sabotage.mjs
   node tools/design-parity/visual-gate.mjs --candidate https://design.p31ca.org --skip-screenshot
   node tools/design-parity/visual-gate.mjs --candidate https://p31-portal-forge.pages.dev --skip-screenshot
   ```

2. Confirm no `--allow` migration flags remain:
   ```
   grep -rn "\-\-allow" production/portals/*/tests/acceptance/gates.json
   # → no matches
   ```

3. Ground-truth resolution:
   ```
   node cli/ground-truth-server.js  # truth_lookup key=design-system-canonical-source
   # → owner @p31ca/design-core@3.0.0
   ```

4. MCP query surface:
   ```
   node packages/canon-mcp/dist/index.js --test list_components '{"category":"chrome"}'
   node packages/canon-mcp/dist/index.js --test find_usages '{"entity":"Topbar"}'
   # → 0 forks (both portals migrated)
   ```

5. Write `docs/workpackages/SYNTHESIS-2026-09-30-canon.md`:
   - which paths converged, which failed
   - baseline (37 forks) vs final (0)
   - MCP query results
   - remaining unknowns

## Gate
Every step above exits 0. If a gate fails, halt — the failing path is the next facet.

## Rollback
Per-path rollbacks (see P1–P8). No global rollback — convergence is the sum of
verified paths.