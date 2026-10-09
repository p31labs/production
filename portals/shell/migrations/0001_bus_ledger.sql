-- p31-portal-shell bus ledger D1 schema
CREATE TABLE IF NOT EXISTS bus_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  session_id TEXT NOT NULL DEFAULT '',
  did TEXT NOT NULL DEFAULT '',
  face TEXT NOT NULL DEFAULT '',
  prev_hash TEXT NOT NULL,
  hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bus_type ON bus_events (event_type);
CREATE INDEX IF NOT EXISTS idx_bus_created ON bus_events (created_at);
CREATE INDEX IF NOT EXISTS idx_bus_session ON bus_events (session_id);