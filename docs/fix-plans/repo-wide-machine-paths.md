# fix: 34 tracked files still reference /home/p31/P31-local-workspace

<!-- P31-HEADER
id: p31_fix_plan_repo_wide_machine_paths_20261009_v1.0
type: fix-plan
component: workspace
status: open
retention: keep-forever
created: 2026-10-09T00:00:00Z
owner: will
-->

## Symptom

The repo's canonical root is `/home/p31/production`, but 34 tracked files still
reference the OLD root `/home/p31/P31-local-workspace` as hardcoded absolute
paths. The SSOT consolidation fixed 6 occurrences inside `packages/canon` +
`packages/design-core` (commit `0be3bbe`); these 34 remain, all outside that
shard. A fresh clone on any other machine cannot run these scripts or resolve
these references.

## Evidence

```bash
git grep -l "P31-local-workspace" | grep -vE '^packages/(canon|design-core)/'
# 34 files
```

Full list (2026-10-09):

```
CONTRIBUTING.md
MCP-SUBMISSION-GUIDE.md
README.md
SECURITY.md
portals/chat/.audit/impeccable.json
portals/chat/.claude/mcp.json
portals/design/AGENTS.md
portals/design/RUNBOOK.md
portals/design/docs/AGENT_RUNBOOK.md
portals/design/docs/BUILD_SPEC.md
portals/design/docs/SYSTEM_ARCHITECTURE.md
portals/design/scripts/deploy-precheck.mjs
portals/design/scripts/sync-p31ca-ambient.mjs
portals/design/tests/acceptance-triage.spec.ts
portals/design/tests/acceptance/audit-derive.mjs
portals/design/tests/acceptance/audit-orphans.mjs
portals/design/tests/acceptance/gates.json
portals/design/tests/acceptance/negative-controls/canon-purity.mjs
portals/design/tests/acceptance/negative-controls/token-audit.mjs
portals/design/vendor/p31ca-ambient/sync.json
portals/forge/scripts/build-manifest.mjs
portals/forge/scripts/gate.mjs
portals/forge/scripts/system-test.mjs
portals/forge/src/data/manifest.json
portals/forge/tests/acceptance/check-gate-registry-drift.mjs
portals/forge/tests/acceptance/gates.json
portals/forge/tests/acceptance/negative-controls/token-audit.mjs
portals/qpj/docs/14-LOVE-LEDGER.md
portals/qpj/docs/15-DIVERGENCES.md
portals/qpj/docs/19-OPERATIONS-GUIDE.md
portals/qpj/docs/25-ECOSYSTEM-DEPENDENCY-GRAPH.md
portals/qpj/scripts/pack-design-core.sh
portals/qpj/src/store/useQpjStore.ts
tools/portal-vendor-sync/ui-src/src/chrome/FeedbackButton.tsx
```

## Fix

1. **Executable scripts** (`.mjs`, `.sh`, `.ts`): replace the absolute
   `/home/p31/P31-local-workspace/...` with a relative path (`../../tools/...`
   or `import.meta.dirname`-derived) — same pattern as the shard fix.
2. **Config/JSON** (`mcp.json`, `gates.json`, `manifest.json`, `sync.json`):
   replace with the new canonical root or a relative path.
3. **Docs** (README, CONTRIBUTING, SECURITY, MCP-SUBMISSION-GUIDE, RUNBOOK, AGENTS,
   qpj docs): these reference the old root in prose/commands; update to
   `/home/p31/production` or a machine-agnostic form.

Split by portal (chat, design, forge, qpj) so each is a reviewable unit.

## Impact

- Until fixed, `git grep -l P31-local-workspace` is non-empty and the repo
  cannot be reproduced on another machine. This is the last machine-specificity
  gate before the SSOT work can be called complete.
- Out of the `0be3bbe` shard scope by design; this is a repo-wide follow-up.