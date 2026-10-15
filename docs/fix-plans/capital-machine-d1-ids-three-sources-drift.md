<!-- P31-HEADER
id: p31_fix_plan_capital_machine_d1_ids_three_sources_drift_20261014_v1.0
type: fix-plan
component: p31-capital-machine
status: resolved
retention: keep-forever
created: 2026-10-14T00:00:00Z
owner: will
-->

# fix-plan: D1 database ids disagree across three sources of truth

## Symptom

The same D1 databases are referenced with **different ids and names** in three
places: the per-worker `wrangler.toml` files, `infra/*.toml`, and the README
"Live Services" table. For a money ledger this is how records end up in the
wrong database.

| Database | README | infra/*.toml | per-worker wrangler.toml |
|----------|--------|--------------|--------------------------|
| revenue ledger | `revenue-ledger-db` `d5d1817c-…` | `d5d1817c-…` | `revenue-db` **`1f219ab8-…`** |
| entitlement | `9b00fb88-…` | — | **`e9e18c25-…`** |
| allocator | `c2e667c0-…` | — | **`d12543b9-…`** |
| capital-db | — | `d7f0afea-…` | **`fd439548-…`** |

## Evidence

- `grep database_id workers/*/wrangler.toml infra/*.toml` (2026-10-14) shows the
  table above.
- Commit `3661d58 fix(d1): recreate deleted capital-machine databases and
  repoint bindings` predates some of these ids — the per-worker tomls were
  repointed, README/infra were not updated.
- `infra/wrangler.revenue-ledger.toml` uses `revenue-ledger-db`/`d5d1817c`
  while `workers/revenue-ledger/wrangler.toml` uses `revenue-db`/`1f219ab8`.

## Root cause

DB recreation and repointing was done incrementally; documentation and the
infra umbrella config were not reconciled, and there is no single source of
truth for D1 identity.

## Fix

1. `wrangler d1 list` against the production account and record the actual
   names/ids per worker.
2. Pick the per-worker `wrangler.toml` as the single source of truth.
3. Update README table + `infra/wrangler.revenue-ledger.toml` to match, or
   delete `infra/*.toml` if it is superseded (see
   `capital-machine-infra-toml-stale-scaffolding`).
4. Add a drift gate: a script comparing committed database ids with
   `wrangler d1 list` (like `scripts/verify-d1.mjs`, extended for names).

## Verification

- Every worker toml references a DB that exists on the account
  (`bash scripts/verify-d1.mjs` green).
- README table rows match the per-worker tomls exactly.
- `wrangler deploy --dry-run` on each worker resolves its binding.

## Impact

Without reconciliation, a deploy from the wrong config can silently point a
worker at a stale/empty database — the ledger's audit guarantees depend on
this being correct.

## Not blocking

Live workers (verified 2026-10-14) answer correctly, so the deployed reality
is currently consistent; the drift is in config/docs.

## Progress (2026-10-14)

- README D1 table updated to the per-worker reality (`revenue-db`/`1f219ab8`,
  `entitlement-db`/`e9e18c25`, `allocator-db`/`d12543b9`, `capital-db`/`fd439548`);
  the stale btcpay D1 id in README corrected to `fd439548`.
- `infra/wrangler.toml`, `infra/wrangler.revenue-ledger.toml` deleted (see
  `capital-machine-infra-toml-stale-scaffolding`); per-worker tomls are now the
  single source of truth.
- Remaining (owner): verify ids against `wrangler d1 list` on the production
  account and add a drift-gate comparing committed ids to live ones.

## Resolution (2026-10-15)

- `verify-d1.mjs` run against the account: **D1 guard PASS — all 5 bound
  databases exist** (`fd439548`, `d12543b9`, `7cb8d8fb`, `e9e18c25`,
  `1f219ab8`). The per-worker tomls are confirmed correct; the README/infra
  values they replaced were stale.
- The drift gate (`verify-d1.mjs`) now ships with the repo
  (`pnpm check:d1`) and fails if any committed `database_id` is deleted.