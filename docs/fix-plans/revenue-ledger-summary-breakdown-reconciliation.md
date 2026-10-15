<!-- P31-HEADER
id: p31_fix_plan_revenue_ledger_summary_breakdown_reconciliation_20261014_v1.0
type: fix-plan
component: workers/revenue-ledger
status: resolved
retention: keep-forever
created: 2026-10-14T00:00:00Z
owner: will
-->

# fix-plan: revenue summary totals do not reconcile with source breakdown

## Symptom

`GET /revenue/summary?range=30d` (live) returns `total_usdc: "0.01"` while
`source_breakdown` shows `depin/honeygain: 4.75`, `depin/storj: 7`, etc.
The headline total and the per-source totals are computed differently, so they
cannot be reconciled by a reader — a direct breach of the "court-admissible,
reconcilable audit trail" claim.

Additionally, the ledger contains records whose `source` values
(`depin/honeygain`, `depin/storj`, `t/a`) are **not in the declared
`RecordRevenueRequest` source union** (`x402 | taler | gumroad | btcpay | love
| arcade`), meaning the source enum is not enforced at the write path.

## Evidence

- Live curl 2026-10-14:
  `{"total_usdc":"0.01",…,"source_breakdown":{"depin/honeygain":{"count":2,"total_usdc":"4.75"},…}}`.
- `workers/revenue-ledger/ledger.ts` `getRevenueSummary`: `total_usdc` sums only
  rows where `isUsdc` (asset check), while `source_breakdown` accumulates every
  row's `total_usdc` per source regardless of asset.
- `workers/revenue-ledger/index.ts:26-36` — the `RecordRevenueRequest.source`
  union does not include the observed sources; the POST handler does not
  validate `source` against it.

## Root cause

Two accumulation semantics in the same summary (asset-filtered total vs.
unfiltered per-source sum) plus unvalidated write input.

## Fix

1. Make the summary internally consistent: either filter the breakdown by the
   same `isUsdc` predicate, or break the total out per asset
   (`total_usdc`/`total_eur`/`total_love`) so the breakdown sums to the total.
2. Enforce `source` membership at `/revenue/record` (400 on unknown source) or
   formally extend the union to the deployed sources (depin/*, etc.).
3. Add a test asserting `sum(source_breakdown.total_usdc) == total_usdc` for
   mixed-asset fixtures.

## Verification

- Live `/revenue/summary` reconciles (breakdown sums to totals) after deploy.
- Unit test `ledger.test.ts` covers mixed-asset summary.
- POST `/revenue/record` with `source: "nonsense"` returns 400.

## Impact

Dashboard reconciliation panel and any grant/customer reporting built on the
summary will show internally contradictory numbers until fixed.

## Resolution (2026-10-14)

- `ledger.getRevenueSummary` now groups by `source, asset` and accumulates
  `total_usdc`/`total_eur`/`total_love`/`total_x402` and the per-source
  breakdown from the **asset column**, so
  `sum(source_breakdown[*].total_usdc) === total_usdc`.
- `POST /revenue/record` validates `source` and `asset` (400 on unknown),
  with the `RecordRevenueRequest` union extended to the deployed sources
  (`depin/*`, `t/a`, `test`, `x402/demo-test`).
- New test `should reconcile summary totals with source breakdown`
  (mixed USDC/EUR/LOVE fixtures). Live ledger (all USDC) now reports
  `total_usdc = 11.79` instead of the broken `0.01`.

## Live verification (2026-10-15)

- `GET /revenue/summary?range=90d` → `total_usdc: 11.79`, breakdown sums to
  11.79 (was 0.01 with an 11.79 breakdown).
- `POST /revenue/record` with `source: "nonsense"` → 400.