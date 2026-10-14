-- 006_cbs_nonce.sql — two-challenge CBS single-use signing nonces.
--
-- Each /blind-sign consumes one `t`; reusing `t` (same ephemeral nonce pair
-- n_0,n_1 across two signings) leaks the issuer secret x
-- (s_1 − s_2 = (c_1 − c_2)·x), so `t` is unique. The claim (INSERT) is the
-- atomic gate BEFORE signing — the losing concurrent request never receives
-- a second signature under the same nonces.
-- Applied to the shared love-ledger D1 (592e3e2e-3203-4e0a-8342-9e85215ec8a6):
--   wrangler d1 execute love-ledger --remote --file=./migrations/006_cbs_nonce.sql
CREATE TABLE IF NOT EXISTS cbs_nonce (
  t       TEXT PRIMARY KEY,
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cbs_nonce_expires ON cbs_nonce (expires);