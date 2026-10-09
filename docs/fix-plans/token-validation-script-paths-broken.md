# fix: canon/design-core token-validation scripts point at nonexistent paths

<!-- P31-HEADER
id: p31_fix_plan_token_validation_script_paths_20261009_v1.0
type: fix-plan
component: packages/canon
status: open
retention: keep-forever
created: 2026-10-09T00:00:00Z
owner: will
-->

## Symptom

The token-generation pipeline's validation step is unwired from a real tool on
this machine. Three `package.json` scripts reference a `token-validation`
directory that either does not exist at the referenced path or lives under a
botched directory name:

- `packages/canon/package.json:24` (`gen:tokens`) → `node ".../home/p31/production/tools (1)/token-validation/src/validate.mjs" --only`
- `packages/canon/package.json:40` (`tokens:dtcg`) → `node /home/p31/P31-local-workspace/tools/token-validation/src/validate.mjs --only`
- `packages/design-core/package.json:109` (`tokens:validate`) → `node /home/p31/P31-local-workspace/tools/token-validation/src/validate.mjs`

Surfaced while running the Path W1 negative control (`pnpm install`) during the
SSOT parallel-paths runbook (2026-10-09). Not an install poison (these are
`scripts`, not `dependencies`), so they do not block `pnpm install` — but they
break the `gen:tokens` regenerate step that `runbooks/RUNBOOK-canonical-source.md`
says to run after every token edit.

## Evidence

```bash
ls -d tools/token-validation "tools (1)/token-validation"
# tools/token-validation: No such file or directory
# tools (1)/token-validation: exists  <- a real dir, but named with a space
grep -rn "token-validation/src/validate.mjs" --include=package.json packages/
```

The `/home/p31/P31-local-workspace` prefix is the same machine-specific root
that poisoned the two `file:` install deps (canon-mcp, ui-react); `gen:tokens`
uses `/home/p31/production` (correct host) but a space-laden dir name.

## Fix

1. Decide the canonical tool location. The tool appears to live at
   `/home/p31/production/tools (1)/token-validation/`; the ` (1)` suffix is a
   botched copy/rename. Rename it to `tools/token-validation/` (or, if a real
   `tools/token-validation` exists elsewhere, point at that).
2. Replace the three absolute paths with the canonical relative path (e.g.
   `node ../../tools/token-validation/src/validate.mjs` from `packages/canon/`
   and `packages/design-core/`), so the scripts are machine-independent.
3. Confirm `node scripts/gen-tokens.mjs` and `npm run tokens:dtcg` exit 0.

## Impact

- The token pipeline cannot currently validate on this machine; any
  `gen:tokens` run silently points at a missing file (or a weirdly-named one).
- Out of scope for the SSOT Path W1 (install poison), but in scope for the SSOT
  blast radius: it breaks the regenerate step the canonical-source runbook
  depends on.
- The `tools (1)` directory name is itself a red flag — a duplicated directory
  from a failed move; flag for the human to confirm it is safe to rename.