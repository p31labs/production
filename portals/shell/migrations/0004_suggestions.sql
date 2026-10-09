-- 0004_suggestions.sql — durable block-replacement suggestions.
-- A Pages Function is a per-request isolate, so suggestions MUST be durable.
-- `accepted` is NULL = pending, 1 = accepted, 0 = rejected. The accept path
-- checks `accepted IS NULL` (idempotent), applies the replacement, sets it.

CREATE TABLE IF NOT EXISTS suggestions (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  anchor_json TEXT NOT NULL,
  replacement TEXT NOT NULL,
  author_did TEXT NOT NULL DEFAULT '',
  accepted INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_suggestions_page ON suggestions (page_id, created_at DESC);