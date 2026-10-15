<!-- P31-HEADER
id: p31_fix_plan_capital_machine_deploy_bindings_gap_20261014_v1.0
type: fix-plan
component: p31-capital-machine/infra
status: resolved
retention: keep-forever
created: 2026-10-14T00:00:00Z
owner: will
-->

# fix-plan: infra/deploy.sh deploys workers without D1/KV bindings

## Symptom

`infra/deploy.sh`'s `deploy_module()` runs
`npx wrangler deploy "$source" --name "$name" --compatibility-date …` with
**no `--d1` / `--kv-namespace` flags**. Every module (yield-vault,
mev-arbitrage, auto-compounder, btcpay-gateway, capital-machine, dashboard)
references `env.CAPITAL_DB` / `env.CAPITAL_KV` / `env.CONFIG_DB` bindings that
the deploy command does not attach. Deploying via this script produces workers
that fail at runtime (binding undefined) or refuses the upload.

The CI workflow (`.github/workflows/deploy.yml` → `bash infra/deploy.sh
"$MODULE" "$ENV"`) routes all deploys through this path, so the failure is on
the only automated deploy route for the capital machine.

## Evidence

- `infra/deploy.sh:61-77` — `deploy_module` signature has no binding args.
- `workers/yield-vault/index.ts`, `workers/mev-arbitrage/index.ts`,
  `workers/btcpay-gateway/index.ts`, `workers/capital-machine/index.ts` all
  read `env.CAPITAL_DB` / `env.CAPITAL_KV`.
- Per-worker `wrangler.toml` files (e.g. `workers/yield-vault/wrangler.toml`)
  declare the bindings — the script bypasses those configs entirely.

## Root cause

`deploy_module` passes a bare entry-point file to `wrangler deploy` instead of
deploying **with the worker's own `wrangler.toml`** (`--config`), so bindings,
crons, observability, and vars defined in those tomls are all dropped.

## Fix

1. Deploy each module with its own config: `npx wrangler deploy --config
   "${ROOT}/workers/<module>/wrangler.toml" [--env $ENV]`.
2. Map module names to their wrangler configs (the current map names files
   directly, skipping `auto-compounder`'s `p31-auto-compounder` service name
   and `alerting`'s nested `src/` layout).
3. Replace the `--name` override (name must come from the toml) and drop the
   now-redundant `--compatibility-*` flags.
4. Add a post-deploy smoke that asserts a binding-dependent route answers
   (e.g. `/stats` on yield-vault returns a D1-backed payload).

## Verification

- `bash infra/deploy.sh yield-vault staging` then
  `curl https://yield-vault.trimtab-signal.workers.dev/stats` returns data.
- `npx wrangler deploy --dry-run --config workers/yield-vault/wrangler.toml`
  lists the `CAPITAL_DB` binding.
- CI `deploy` job passes its health checks for the deployed module.

## Impact

Every deploy through this script is currently non-functional or broken — the
automated release path for the capital machine does not work as written.

## Not blocking

Manual deploys with per-worker tomls (as recorded in git history) are the path
that keeps the live workers healthy today.

## Resolution (2026-10-14)

- `infra/deploy.sh` rewritten: `deploy_module` now runs
  `npx wrangler deploy --config <worker>/wrangler.toml`, so D1/KV bindings,
  crons, observability, and vars survive every deploy.
- Module map corrected (compounder → `p31-auto-compounder`, alerting nested
  `src/`, btcpay added).
- Created `workers/capital-machine/wrangler.toml` so the orchestrator deploys
  with its `CAPITAL_DB`/`CAPITAL_KV` bindings.
- CI `deploy.yml` routes through the same fixed script.

## Deploy verification (2026-10-15)

- `scripts/deploy-live.sh` redeployed revenue-ledger, entitlement,
  capital-allocator, config-gateway, and the portal from per-worker tomls;
  all health checks 200.