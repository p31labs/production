-- 0001_usage_events.sql — E-2 per-tool usage counters.
-- The bridge write-side POSTs {server, tool} to /internal/usage
-- (header X-Internal-Usage-Key); the registry upserts into this table and
-- serves the counters via GET /analytics/tools (admin secret).
-- Schema: {server, tool, count, last_called} per the runbook contract.

CREATE TABLE IF NOT EXISTS usage_events (
  server TEXT NOT NULL,
  tool TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  last_called TEXT,
  PRIMARY KEY (server, tool)
);

CREATE INDEX IF NOT EXISTS idx_usage_events_count ON usage_events (count DESC);