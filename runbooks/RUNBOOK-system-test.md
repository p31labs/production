# RUNBOOK-system-test

## When to use
The `system-test` gate fires: a cross-domain invariant failed. The eight-layer suite (`tools/system-test/run.mjs`) detects any of: an unresolvable constitution runbook, a mirror whose parity gate doesn't exist, a missing/failing negative control, a non-idempotent reconcile, a hardcoded model literal in the router, a broken citation replay command, a fail-open guard, or an empty population.

## Prerequisites
- You can run the full suite: `node tools/system-test/run.mjs`
- You can run the fast subset (PR gate): `node tools/system-test/run.mjs --fast`
- You can run the sabotage NC: `node tools/system-test/negative-controls/sabotage.mjs`
- Workers AI env for live layers: `CLOUDFLARE_ACCOUNT_ID`, `CF_API_TOKEN` (or the suite SKIPs loudly, not silently)

## Steps
1. Run the failing layer in isolation: `node tools/system-test/run.mjs --layer=L5` (e.g. L5 for citations).
2. Read the named failure class — each layer reports `missing-runbook`, `chain-not-mirrored`, `hardcoded-model-name`, `replay-command-failed`, `guard-not-fail-closed`, `population-blind`, etc. The class names the fix.
3. Fix the underlying cause, not the test. Examples:
   - `missing-runbook`: the runbook referenced by a gate's remediation doesn't exist — write it or re-point.
   - `chain-not-mirrored`: run `govern reconcile specs/enterprise.govern.yaml` (the audit domain appends a block per audit run — this is the designed cadence).
   - `hardcoded-model-name`: a `@cf/...` literal landed in router code — move it to the catalog-driven selector.
   - `replay-command-failed`: a citation's replayCommand points at a moved/deleted file — update the command or the evidence.
4. Re-run the layer; then the full suite.

## How to verify
- `node tools/system-test/run.mjs` → all 8 layers pass, `SYSTEM_TEST_OK`, exit 0.
- `node tools/system-test/negative-controls/sabotage.mjs` → all injections caught with their named classes, `NEGATIVE_CONTROL_OK`, exit 0.

## Common pitfalls
- **Empty population is a pass, not a failure** — the suite treats count==0 as `population-blind`. A layer that scans nothing and returns green is a lie.
- **The audit domain appends a block per audit run** — L3's idempotency check expects `reconcile → audit → reconcile`; a naive stability expectation is wrong.
- **First run of a fresh suite is expected to FAIL** — the suite exists to find bugs. Fix the findings, don't weaken the checks.

## Owner + last verified
`Owner: govern-runtime` · `Last verified: 2026-09-28`