-- 007_cbs_coin.sql — single-use spent coins for the two-challenge CBS scheme.
--
-- Each blind-signature coin (c'_0) is spent exactly once at /withdraw or
-- /verify-settlement. Replaying the same coin against the payer's DID
-- drains the balance, so the coin id is claimed here BEFORE the debit.
-- A second presentation hits the PRIMARY KEY: the INSERT is the first
-- statement of the spend batch, so a concurrent replay aborts before any
-- debit runs (rejected with 409). This is the other half of replay
-- protection (cbs_nonce guards the signing nonce t; this guards the
-- issued token at spend time).
-- Applied to the shared love-ledger D1 (592e3e2e-3203-4e0a-8342-9e85215ec8a6):
--   wrangler d1 execute love-ledger --remote --file=./migrations/007_cbs_coin.sql
CREATE TABLE IF NOT EXISTS cbs_coin (
  coin    TEXT PRIMARY KEY,
  did     TEXT NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cbs_coin_expires ON cbs_coin (expires);