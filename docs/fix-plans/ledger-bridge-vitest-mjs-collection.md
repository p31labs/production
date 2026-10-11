# fix: ledger-bridge `vitest run` cannot collect node:test `.mjs` suites

<!-- P31-HEADER
id: p31_fix_plan_ledger_bridge_vitest_mjs_20261011_v1.0
type: fix-plan
component: workers/ledger-bridge
status: open
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

`workers/ledger-bridge/package.json` `test` script is `vitest run`, but
`test/sdjwt.test.mjs` and `test/mldsa65-verify.test.mjs` are written for the
Node built-in runner (`node:test` + `node:assert`). `vitest run` reports them as
**failed suites**:

```
FAIL  test/mldsa65-verify.test.mjs  Error: No test suite found in file
FAIL  test/sdjwt.test.mjs           Error: No test suite found in file
```

The tests themselves pass; they are simply not collected by vitest.

## Evidence

- `workers/ledger-bridge/package.json` scripts.test = `vitest run`.
- `npx vitest run` → 2 failed suites, 10 passed (kem).
- `node --test test/sdjwt.test.mjs test/mldsa65-verify.test.mjs` → **23/23 pass**.

## Fix

One of:
1. Set `scripts.test` to run both: e.g.
   `vitest run && node --test test/*.test.mjs` (and exclude `*.test.mjs` from
   vitest via `test.exclude`), or
2. Migrate the `.mjs` suites to vitest, or
3. Add a `vitest.config.ts` with `include: ["test/**/*.test.ts"]` so the `.mjs`
   node:test files are skipped and run in a separate `test:node` script.

Option 3 keeps both runners clean and is the least invasive.

## Impact

- Today, CI that runs only `vitest run` **silently loses 23 SDK/ML-DSA tests**.
  This is a coverage blind spot on the PQ SD-JWT path.
- No false crypto claim is involved, but the test-count claims in older docs
  (§6 of the alignment report) must be read as runner-specific.
