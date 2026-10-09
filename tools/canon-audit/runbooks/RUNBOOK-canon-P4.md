# RUNBOOK-canon-P4 — Retarget canon-mcp (chrome → design-core, contracts → canon)

**Purpose:** canon-mcp serves TWO surfaces correctly:
- **chrome/visual** query tools → `@p31ca/design-core` (the visual canon)
- **contract/tokens/loom** tools → `@p31ca/canon` (the contracts/governance layer — KEEP)
**Owner:** mcp maintainer. **Depends on:** nothing.

## Steps

1. Read the current server (`packages/canon-mcp/src/server.ts`) — it reads
   contracts + tokens from `@p31ca/canon`. That is correct FOR CONTRACTS.

2. Add the chrome/visual query tools pointing at `@p31ca/design-core`:
   - `list_chrome` → `packages/design-core/src/genui/catalog.json` filtered `category:chrome`
   - `get_chrome` → one chrome component's `@p31ca/design-core/compositions/` file
   - `find_usages` → grep `production/portals/*/src` for the component name
   - `whats_deprecated` → catalog `status:'deprecated'`

3. Keep the existing contract/tokens/loom tools on `@p31ca/canon` (they validate
   the contracts — a different layer, not chrome).

4. Register in `~/.config/opencode/opencode.jsonc` as `design-canon`.

## Gate
```
grep -q "design-core" packages/canon-mcp/src/*.ts && echo "PASS: chrome tools point at design-core"
grep -q "@p31ca/canon" packages/canon-mcp/src/*.ts && echo "PASS: contract tools stay on canon"
node packages/canon-mcp/dist/index.js --test find_usages '{"entity":"Topbar"}' | grep -q "production/portals" && echo PASS
```

## Negative control
`get_chrome` for a fabricated name returns `NOT_FOUND` (closed-world resolution).

## Rollback
```
git checkout HEAD -- packages/canon-mcp/
```