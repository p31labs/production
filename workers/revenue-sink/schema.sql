-- Revenue Sink D1 schema. Apply with:
--   npx wrangler d1 execute revenue-sink --remote --file=./schema.sql
CREATE TABLE IF NOT EXISTS sink_entries (
  id          TEXT PRIMARY KEY,
  source      TEXT NOT NULL,
  amount_usdc TEXT NOT NULL,
  asset       TEXT,
  payer_did   TEXT,
  external_id TEXT,
  metadata    TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sink_source ON sink_entries(source, created_at);
CREATE INDEX IF NOT EXISTS idx_sink_time ON sink_entries(created_at);