-- p31-revenue-ledger D1 schema
CREATE TABLE IF NOT EXISTS revenue_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  payer_did TEXT NOT NULL DEFAULT '',
  merchant_did TEXT NOT NULL DEFAULT '',
  amount_usdc TEXT NOT NULL,
  asset TEXT NOT NULL DEFAULT 'USDC',
  metadata TEXT NOT NULL DEFAULT '',
  prev_hash TEXT NOT NULL,
  hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_revenue_source ON revenue_ledger (source);
CREATE INDEX IF NOT EXISTS idx_revenue_created ON revenue_ledger (created_at);