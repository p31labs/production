-- p31-rum D1 schema. Applied remotely once at creation time:
--   wrangler d1 execute p31-rum --remote --file schema.sql
-- No drops, no deletes — create-if-not-exists only.

CREATE TABLE IF NOT EXISTS rum_metrics (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT    NOT NULL,               -- INP | LCP | CLS | TTFB | FCP
  value REAL    NOT NULL,               -- metric value (ms or score)
  page  TEXT    NOT NULL,               -- page URL (origin-validated)
  ts    INTEGER NOT NULL                -- unix ms, validated ±1h at ingest
);

CREATE INDEX IF NOT EXISTS idx_rum_metrics_name_ts ON rum_metrics (name, ts);