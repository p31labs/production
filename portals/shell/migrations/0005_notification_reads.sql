-- 0005_notification_reads.sql — per-participant read watermarks.
-- Read state is derived per-did, never a ledger event. A 256-member read must
-- not append 256 rows; reading is not an accountable change to shared state.
-- `exceptions_json` holds ids marked unread after the watermark (the "marked
-- one unread after reading past it" case a bare watermark cannot express).

CREATE TABLE IF NOT EXISTS notification_reads (
  did TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  last_read_at INTEGER NOT NULL,
  exceptions_json TEXT,
  PRIMARY KEY (did, object_type, object_id)
);