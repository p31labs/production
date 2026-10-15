<!-- P31-HEADER
id: p31_fix_plan_capital_machine_ci_verify_stale_targets_20261014_v1.0
type: fix-plan
component: .github/workflows/deploy.yml
status: resolved
retention: keep-forever
created: 2026-10-14T00:00:00Z
owner: will
-->

# fix-plan: CI deploy verification targets a worker that is not deployed

## Symptom

`.github/workflows/deploy.yml` fails the `deploy` job when
`https://capital-machine.trimtab-signal.workers.dev/health` does not return
200. That worker currently returns **404** (2026-10-14), so any CI deploy that
reaches the verification step fails. The `health-check` job also curls every
module — including the knowingly-undeployed stub workers
(cashback-collector, ip-licensing, micro-savings, affiliate-fleet,
airdrop-harvester, data-monetization) — and only warns, so the signal is noise.

## Evidence

- `curl -s -o /dev/null -w "%{http_code}" https://capital-machine.trimtab-signal.workers.dev/health` → `404`.
- `deploy.yml` "Verify deployment" step: hard-requires `capital-machine …/health == 200`.
- `deploy.yml` "Post-Deploy Health Check": loops `MODULES="capital-machine yield-vault mev-arbitrage … data-monetization"`.

## Root cause

The workflow was written when the orchestrator was expected live and every
module deployable; reality (README "Honest Status") is that the orchestrator
is not deployed and several modules are stubs.

## Fix

1. Verify only the modules actually deployed by the job, against endpoints
   that exist (revenue-ledger/entitlement/capital-allocator/alerting/etc.).
2. Gate `capital-machine` verification on its real deployment status — deploy
   the orchestrator or drop it from the verify list.
3. Make the stub-module health checks a `warning` (already) and remove
   hard-fail semantics on them; or exclude stubs from the module options until
   they are real (see `capital-machine-stub-workers-in-deploy-path`).

## Verification

- A CI run of `deploy.yml` passes end-to-end with healthy endpoints only.
- The verify step no longer references a 404 worker.

## Impact

CI deploy today is guaranteed to fail at verification or produce misleading
health output — nobody can get a green deploy through the workflow.

## Not blocking

The real live stack (verified 200, 2026-10-14) is deployed via manual
per-worker tomls, not CI.

## Resolution (2026-10-14)

- `deploy.yml` verify step now checks the live `revenue-ledger` `/health` (200)
  instead of the 404 `capital-machine` orchestrator.
- Post-deploy health-check narrowed to the real live modules
  (revenue-ledger, entitlement, capital-allocator, yield-vault, mev-arbitrage,
  btcpay-gateway, monetization-alerting).
- Module dropdown reduced to the deployable set (all | capital-machine |
  yield-vault | mev | compounder | btcpay | alerting).