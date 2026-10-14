# fix: deployed love-ledger hash-chain SQL targets a love_chain schema the shared D1 does not have

<!-- P31-HEADER
id: p31_fix_plan_love_chain_schema_drift_20261011_v1.0
type: fix-plan
component: workers/love-ledger
status: resolved
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

The deployed worker `workers/love-ledger/src/index.ts` (v1.4.0) reads/writes
the court-admissible hash chain with this schema:

```ts
// chainAppend() + getChain()/exportChain()
SELECT entry_hash FROM love_chain ORDER BY id DESC LIMIT 1
INSERT INTO love_chain (entry_type, entry_hash, prev_hash, payload_json, created_at) ...
SELECT id, entry_type, entry_hash, prev_hash, created_at FROM love_chain ...
```

The LIVE `love_chain` table in the shared D1
(592e3e2e-3203-4e0a-8342-9e85215ec8a6) has the phos-era schema (applied via
`d1_migrations` 2026-07-11, `002_love_chain.sql`):

```sql
CREATE TABLE love_chain (id TEXT PRIMARY KEY, from_did TEXT NOT NULL,
  to_did TEXT NOT NULL, amount REAL NOT NULL, type TEXT NOT NULL,
  signature TEXT, prev_hash TEXT NOT NULL, entry_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL, signature_pqc TEXT)
```

Every `chainAppend()` call therefore throws ("no such column: entry_type")
and the error is swallowed by the existing `.catch(() => {})` sites — the
v1.4.0 earn/spend paths silently drop their court-admissible chain entries,
and `GET /api/love/chain` + `/api/love/export` fail outright.

## Evidence

- Live probe (2026-10-11, read-only):
  `wrangler d1 execute love-ledger --remote --command "SELECT sql FROM
  sqlite_master WHERE name='love_chain'"` → phos-era schema (above).
- `workers/love-ledger/src/index.ts:112-124` (`chainAppend`) uses
  `entry_type`/`payload_json` columns that do not exist in the live table.
- Discovered while porting the two-challenge CBS settlement
  (see `docs/specs/love-settlement-cbs.md`): the CBS `/withdraw` and
  `/verify-settlement` routes therefore append chain entries with a
  live-schema-aware statement instead of `chainAppend()`
  (`src/index.ts` spendCoin batch, statement 4).

## Fix

Align the worker's chain SQL with the live schema. Recommended minimal
path: keep the live phos-era `love_chain` table as the canonical one and
update `chainAppend`/`getChain`/`exportChain` to the
`id/from_did/to_did/amount/type/signature/prev_hash/entry_hash/created_at`
columns (per-DID `from_did` prev-hash chaining, `to_did =
'system:love-issuer'` for spends). Alternatively migrate the table to the
v1.4.0 schema and backfill — higher blast radius, needs owner sign-off.

## Impact

- Court-admissible chain entries for the pre-CBS earn/spend paths are
  silently absent in production; the chain read/export endpoints 500.
- Not introduced by the CBS workstream, but found by it; the CBS routes
  themselves are unaffected (they append with the correct live schema).

## Resolution (2026-10-12, deploy wave)

Recommended minimal path applied — code aligned to the live phos-era table,
no schema/table changes (live tables untouched):

- `chainAppend` (`src/index.ts:119-147`) now writes
  `id/from_did/to_did/amount/type/signature/prev_hash/entry_hash/created_at`.
  Earns flow `system:love-issuer → user`; spends (`type` `SPEND`) flow
  `user → system:love-issuer`. Prev-hash chaining is per-DID on `from_did`
  (`ORDER BY created_at DESC, rowid DESC LIMIT 1`), mirroring the CBS
  spendCoin writer (`src/index.ts:903-925`). `id` reuses the caller's
  `transactionId`; `signature` is NULL (no per-entry sig on these paths).
- `getChain` (`src/index.ts:759-764`) and `exportChain` (`:766-772`) select
  the live columns, ordered by `created_at`/`rowid` (id is a TEXT uuid).
- No `entry_type`/`payload_json` references remain (grep clean).
- Pre-checks green: `npx tsc --noEmit` exit 0; `wrangler deploy --dry-run`
  clean. Deployed version `b3752bd8-a7e5-46ec-961e-fb148df8e80f`.
- Verification: `GET https://love-ledger.p31ca.org/health` → 200;
  `GET /blind-pubkey` → 200 with X/R0/R1/t; `GET /api/love/chain` and
  `/api/love/export` → 200 with live-schema rows (no more 500).
  `node scripts/cbs-settlement-smoke.mjs` → CBS SETTLEMENT SMOKE: PASS
  (A1–A4, B1–B3; Leg C skipped — `LOVE_AUTH_SECRET` not set in the runner
  env, gateway untouched per wave rules).
- Read-only schema probe re-confirmed the live table is unchanged
  (phos-era DDL on D1 `592e3e2e…`, rows_written: 0).