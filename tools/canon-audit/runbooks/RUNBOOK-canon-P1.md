# RUNBOOK-canon-P1 — State the invariant

**Purpose:** Register the canon claim so agents resolve `@p31ca/design-core` by
lookup, not inference. **Owner:** workspace-architect. **Depends on:** nothing.

## Steps

1. Confirm the invariant is registered (done 2026-09-30):
   ```
   node cli/ground-truth-server.js  # tools/call truth_lookup key=design-system-canonical-source
   ```
   → `found: true`, owner `@p31ca/design-core@3.0.0`.

2. Fix `VERIFIED_FACTS.md` — replace stale `@p31ca/design-core 2.1.0` with the
   actual `@p31ca/design-core 3.0.0`. Add the namespace note:
   > The design system is `@p31ca/design-core`. Earlier `@p31ca/design-core`
   > references are pre-namespace-move; both refer to the same system.
   > `@p31ca/design-core` is authoritative.

3. Move `DESIGN.md` from `packages/canon/` to `packages/design-core/`:
   ```
   git mv packages/canon/DESIGN.md packages/design-core/DESIGN.md
   ```
   Re-point any `{token.ref}` values against `packages/design-core/tokens/tokens.dtc.json`.

4. Reference it from `AGENTS.md`:
   ```markdown
   ## Design system — single source of truth
   The design system is `@p31ca/design-core@3.0.0`. Read
   `packages/design-core/DESIGN.md` before any UI change. Canon chrome lives in
   `@p31ca/design-core/compositions/`. Do NOT import `@p31ca/canon` or `@p31ca/ui`.
   ```

## Gate
```
grep -q "@p31ca/design-core@3.0.0" AGENTS.md && echo PASS
node cli/ground-truth-server.js  # truth_lookup → found:true
test -f packages/design-core/DESIGN.md && echo PASS
```

## Negative control
A lookup for a non-existent key returns `MISSING TRUTH OWNER` (not the nearest doc).

## Rollback
```
git checkout HEAD -- AGENTS.md VERIFIED_FACTS.md
git mv packages/design-core/DESIGN.md packages/canon/DESIGN.md
```