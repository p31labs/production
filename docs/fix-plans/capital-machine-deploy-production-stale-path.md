<!-- P31-HEADER
id: p31_fix_plan_capital_machine_deploy_production_stale_path_20261014_v1.0
type: fix-plan
component: scripts/deploy-production.sh
status: resolved
retention: archive-90d
created: 2026-10-14T00:00:00Z
owner: will
-->

# fix-plan: deploy-production.sh references a nonexistent absolute path

## Symptom

`scripts/deploy-production.sh` hardcodes `cd /home/p31/p31-capital-machine/…`
for every phase, but the repo lives at
`/home/p31/production/p31-capital-machine/`. The script cannot run on this
machine and would push users toward a stale clone path. The README "Quick
Start" tells users to run exactly this script.

## Evidence

- `scripts/deploy-production.sh` phases 1-4: `cd /home/p31/p31-capital-machine/infra`, `cd /home/p31/p31-capital-machine/workers/entitlement`, etc.
- `pwd` of the actual checkout: `/home/p31/production/p31-capital-machine`.

## Root cause

Path copy-paste from an earlier layout; the script was never re-pointed after
the move under `production/`.

## Fix

1. Resolve the repo root relative to the script:
   `ROOT="$(cd "$(dirname "$0")/.." && pwd)"` and use `$ROOT/...` everywhere.
2. Keep the README Quick Start consistent with the new path (or instruct from
   `p31-capital-machine/`).
3. Prefer per-worker `wrangler.toml` deploys (see
   `capital-machine-deploy-bindings-gap`) rather than the 
   `--config wrangler.revenue-ledger.toml` approach here.

## Verification

- `bash scripts/deploy-production.sh` reaches the first deploy step without a
  `No such file or directory` error (dry-run where possible).

## Impact

Low — manual-only script, but it is the documented deploy entry point and
fails immediately.

## Resolution (2026-10-14)

- `scripts/deploy-production.sh` now derives `ROOT` from the script location
  and deploys from per-worker `wrangler.toml` files (no more
  `/home/p31/p31-capital-machine/` hardcodes, no more `infra/wrangler.*.toml`
  references). BTCPay Gateway added as an explicit phase.