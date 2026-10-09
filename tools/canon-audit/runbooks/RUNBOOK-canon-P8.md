# RUNBOOK-canon-P8 — Retire @p31ca/ui; keep the contract layer

**Purpose:** Retire `@p31ca/ui@1.3.1` (its chrome is superseded by
`@p31ca/design-core/compositions`). **Keep** `@p31ca/canon` — it is the contract /
governance layer (loom + contracts) that audits design-core, NOT a competing
design system. **Owner:** migration lead. **Depends on:** P3. **Blocking for:** P9.

## Steps

1. **Retire `@p31ca/ui`** (chrome only — superseded by design-core compositions):
   - Enumerate consumers:
     ```
     rg -l "@p31ca/ui|@p31ca/ui" --glob '!**/node_modules/**' --glob '!**/dist/**'
     ```
   - For each, map `@p31ca/ui/chrome/*` → `@p31ca/design-core/compositions/*`.
   - Deprecate + archive the package (source stays in git history).

2. **Keep `@p31ca/canon`** as the contracts layer, but re-label it explicitly in
   its README + package.json description:
   > `@p31ca/canon` is the CONTRACT + governance layer (component contracts,
   > Loom WIMSE DSSE audit log). It is NOT the visual design system. The visual
   > canon is `@p31ca/design-core@3.0.0`. Agents: do not import canon for chrome.

3. **Fix canon-mcp** (see P4): contract/tokens/loom tools stay on `@p31ca/canon`;
   chrome/visual query tools point at `@p31ca/design-core`.

4. Update docs: replace every "canon = the design system" reference with the
   layered truth (design-core = visual canon, canon = contracts).

## Gate
```
rg -l "@p31ca/ui" --glob '!**/node_modules/**' --glob '!**/dist/**' \
  --glob '!archive/**' | wc -l | grep -q "^0$" && echo "PASS: no @p31ca/ui consumers"
node tools/canon-audit/canon-source-audit.mjs && echo "PASS: no visual forks"
# contracts layer intact:
ls packages/canon/src/contracts/*.ts | wc -l | grep -q "[1-9]" && echo "PASS: contracts kept"
```

## Negative control
A file re-importing `@p31ca/ui` fails a retired-check.

## Rollback
```
npm deprecate @p31ca/ui "" ; git checkout HEAD -- packages/ui/ packages/canon/
```