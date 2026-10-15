<!-- P31-HEADER
id: p31_fix_plan_capital_machine_infra_toml_stale_scaffolding_20261014_v1.0
type: fix-plan
component: p31-capital-machine/infra
status: resolved
retention: archive-90d
created: 2026-10-14T00:00:00Z
owner: will
-->

# fix-plan: infra/wrangler.toml is stale commented-out scaffolding

## Symptom

`infra/wrangler.toml` defines only the `capital-machine` worker (with a D1 id
`d7f0afea-…` that no per-worker toml uses) and then **comments out** the
yield-vault / mev / fundraising / compounder / cashback / ip-licensing /
micro-savings / affiliate / airdrop / data sections with a "STALE IDs" note.
`infra/wrangler.revenue-ledger.toml` duplicates revenue-ledger with a database
name/id (`revenue-ledger-db`/`d5d1817c-…`) that contradicts
`workers/revenue-ledger/wrangler.toml` (`revenue-db`/`1f219ab8-…`).

This is drift noise: three tomls purport to configure the same fleet and only
the per-worker set matches the deployed reality.

## Evidence

- `infra/wrangler.toml` — capital-machine D1 id `d7f0afea-…`; ~50 lines of
  commented-out module stanzas.
- `infra/wrangler.revenue-ledger.toml` vs `workers/revenue-ledger/wrangler.toml`
  disagree on name+id (see `capital-machine-d1-ids-three-sources-drift`).
- Live workers are configured per-worker (200s verified 2026-10-14).

## Root cause

The umbrella config was the original scaffold; per-worker configs became the
reality and the umbrella was never deleted or reconciled.

## Fix

1. Delete `infra/wrangler.toml` and `infra/wrangler.revenue-ledger.toml`
   (or reduce them to a single documented pointer to per-worker configs).
2. Update `scripts/deploy-production.sh` / `infra/deploy.sh` to stop
   referencing them (see `capital-machine-deploy-bindings-gap`,
   `capital-machine-deploy-production-stale-path`).
3. Keep `infra/crons.toml` only if it is actually consumed; otherwise remove.

## Verification

- `grep -r "wrangler.toml" scripts/ infra/` shows no references to the deleted files.
- `wrangler d1 list` + per-worker `--dry-run` confirms one source of truth.

## Impact

Reduces the chance someone deploys from the stale umbrella and points a worker
at the wrong database. Documentation-only risk today.

## Resolution (2026-10-14)

- `infra/wrangler.toml`, `infra/wrangler.revenue-ledger.toml`, and the
  unreferenced `infra/crons.toml` deleted from the repo.
- `scripts/deploy-production.sh` and `infra/deploy.sh` no longer reference the
  deleted configs (see `capital-machine-deploy-bindings-gap`,
  `capital-machine-deploy-production-stale-path`).
- Per-worker `wrangler.toml` files are now the single source of truth for the
  fleet.