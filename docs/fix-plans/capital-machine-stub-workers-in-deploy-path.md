<!-- P31-HEADER
id: p31_fix_plan_capital_machine_stub_workers_in_deploy_path_20261014_v1.0
type: fix-plan
component: p31-capital-machine/infra
status: resolved
retention: keep-forever
created: 2026-10-14T00:00:00Z
owner: will
-->

# fix-plan: knowingly-stub workers remain in the deploy path

## Symptom

`infra/deploy.sh all` and the CI workflow's module options include
cashback-collector, airdrop-harvester, fundraising-agent, ip-licensing,
micro-savings, affiliate-fleet, data-monetization. README "Honest Status"
marks these as STUB / Partial / Scaffold, and the code comments confirm:

- `workers/cashback-collector/index.ts` hits `api.pump.fun/cashback`,
  `api.jup.ag/cashback`, `api.1inch.io/cashback`, `api.odos.xyz/cashback` —
  endpoints that do not exist.
- `workers/airdrop-harvester/index.ts` — "Most protocol connectors are dead
  stubs and /sell fabricates a zero TxHash".
- `workers/fundraising-agent/index.ts` — marks leads `status='sent'` without
  dispatching mail (line ~521).

Deploying them ships broken workers and fabricates revenue capability —
exactly what the README's honesty rails warn against.

## Evidence

- `infra/deploy.sh` `all` case lists all 10 revenue modules including stubs.
- `.github/workflows/deploy.yml` module dropdown includes `cashback-collector`,
  `ip-licensing`, `micro-savings`, `affiliate-fleet`, `airdrop-harvester`,
  `data-monetization`.
- Worker file comments (above) + README table.

## Root cause

The deploy tooling was written when all 10 workers were planned as real; the
honesty assessment (README) came later and the deploy path was not narrowed.

## Fix

1. Remove stub modules from `infra/deploy.sh` `all` and the CI module options
   until each worker is real (real endpoint, real mail path, real claim path).
2. Keep a separate `scripts/deploy-stubs-dev.sh` (or `--env staging` only) for
   scaffolding development.
3. Optionally add a deploy-time guard: refuse to deploy a worker whose source
   contains a `STUB`/fabricated-endpoint marker.

## Verification

- `bash infra/deploy.sh all production` deploys only: capital-machine,
  dashboard, yield-vault, mev-arbitrage, auto-compounder, (real modules).
- CI module dropdown matches the real set.

## Impact

Prevents accidental "deployed revenue worker" claims and broken endpoints from
reaching production.

## Resolution (2026-10-14)

- `infra/deploy.sh` `all` and the module map now deploy only real workers:
  capital-machine, yield-vault, mev-arbitrage, auto-compounder, btcpay-gateway,
  alerting. Stub/scaffold workers are no longer deployable through it.
- CI `deploy.yml` module dropdown trimmed to the same real set.