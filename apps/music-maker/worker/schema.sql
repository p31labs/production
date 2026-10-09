-- music-maker D1 schema.
-- Apply remote: wrangler d1 execute music-maker --remote --file=./schema.sql
-- Apply local:  wrangler d1 execute music-maker --local  --file=./schema.sql
-- Verify:       wrangler d1 execute music-maker --remote \
--                 --command "SELECT name FROM sqlite_master WHERE type='table'"
--                 (expect: events, mappings, patches)

PRAGMA journal_mode = WAL;

-- The music maker's committed composition log, D1-backed. Same shape as the
-- Loom's events table: one row per event, seq is the gate-assigned monotonic
-- id, `data` holds the full LoomEvent JSON so the canon's replay reconstructs
-- events exactly. prev_hash links each row to the one before it (SHA-256 of
-- the previous row's canonical preimage) — the composition's tamper-evidence
-- layer. The music maker's committed events (instrument.zone.place/clear/name)
-- share this gate and chain semantics with the Loom's log.
CREATE TABLE IF NOT EXISTS events (
  seq INTEGER PRIMARY KEY,
  ts  TEXT NOT NULL,
  data TEXT NOT NULL,
  prev_hash TEXT NOT NULL DEFAULT '',
  scope TEXT NOT NULL DEFAULT 'shared'
);

CREATE INDEX IF NOT EXISTS events_ts ON events(ts);

-- Control server — QUERY PROJECTIONS, not a second truth.
--
-- The `events` table above is the single source of truth (the canon gate
-- validates control.mapping.set/clear, control.patch.set, control.midi.learn
-- on every append; the ControlRoom DO folds committed events into its in-memory
-- routing table). These tables are DERIVED read-models for fast listing and the
-- connect snapshot; they are rebuildable from the log and must never be treated
-- as authoritative on their own.
--
-- `source` is UNIQUE here to mirror the canon gate's MVP one-to-one routing
-- rule (a source drives one destination; a destination accepts one source) —
-- defense in depth: the projection cannot drift into fan-out even if a bug
-- bypasses the gate.
CREATE TABLE IF NOT EXISTS mappings (
  destination TEXT PRIMARY KEY,
  source TEXT NOT NULL UNIQUE,
  mapping TEXT NOT NULL DEFAULT '{}',
  committed_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS patches (
  id TEXT PRIMARY KEY,
  engine TEXT NOT NULL CHECK (engine IN ('polysynth', 'noisemachine', 'drumkit')),
  params TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT ''
);