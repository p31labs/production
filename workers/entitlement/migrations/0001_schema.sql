-- p31-entitlement D1 schema
CREATE TABLE IF NOT EXISTS entitlements (
  did TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free',
  used INTEGER NOT NULL DEFAULT 0,
  cycle TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  PRIMARY KEY (did, cycle)
);

CREATE TABLE IF NOT EXISTS love_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  did TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_love_did ON love_ledger (did);