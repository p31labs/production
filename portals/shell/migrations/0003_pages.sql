-- 0003_pages.sql — pages, spaces, and the versioned checkpoint store.
-- A page can live standalone (space_id NULL) or inside a space; parent_page_id
-- nests subpages. Deletion is a trash move (trashed_at set), never a blast.
-- page_versions holds the chunked Yjs snapshots (one row per ~1.5MB chunk).

CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_did TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  space_id TEXT,
  parent_page_id TEXT,
  title TEXT NOT NULL DEFAULT '',
  author_did TEXT NOT NULL DEFAULT '',
  trashed_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pages_space ON pages (space_id, parent_page_id);
CREATE INDEX IF NOT EXISTS idx_pages_trash ON pages (trashed_at);

CREATE TABLE IF NOT EXISTS page_versions (
  page_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  hash TEXT NOT NULL,
  snapshot BLOB,
  chunk INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (page_id, seq, chunk)
);