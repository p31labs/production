-- forum-api D1 schema. Threads mirror blog slugs so a post and its thread
-- share an id: the bridge writes /blog/<slug>.md, the forum seeds a thread
-- with the same slug, and "discuss" links join them.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS threads (
  id          TEXT PRIMARY KEY,              -- == blog slug when promoted from a post
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  author_did  TEXT NOT NULL,                 -- did:key, never a real name
  tags        TEXT NOT NULL DEFAULT '[]',    -- JSON array
  status      TEXT NOT NULL DEFAULT 'open',  -- open | answered | locked
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id          TEXT PRIMARY KEY,
  thread_id   TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  parent_id   TEXT REFERENCES posts(id) ON DELETE CASCADE,  -- null = top-level answer
  body        TEXT NOT NULL,
  author_did  TEXT NOT NULL,
  accepted    INTEGER NOT NULL DEFAULT 0,
  edited_at   INTEGER,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS votes (
  target_id   TEXT NOT NULL,                 -- thread id or post id
  target_kind TEXT NOT NULL,                 -- 'thread' | 'post'
  voter_did   TEXT NOT NULL,
  value       INTEGER NOT NULL CHECK (value IN (-1, 1)),
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (target_id, target_kind, voter_did)
);

-- IndieWeb webmentions — replies/likes/reposts from other sites, folded into
-- the matching thread (thread id == blog slug). `type` is inferred from the
-- source's microformats (reply, like, repost, bookmark).
CREATE TABLE IF NOT EXISTS webmentions (
  id          TEXT PRIMARY KEY,
  thread_id   TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  source      TEXT NOT NULL,                 -- the originating URL
  target      TEXT NOT NULL,                 -- the blog post /thread URL
  type        TEXT NOT NULL DEFAULT 'reply', -- reply | like | repost | bookmark
  author_name TEXT,
  author_url  TEXT,
  content     TEXT,
  published   INTEGER,
  created_at  INTEGER NOT NULL,
  UNIQUE (source, target)
);

CREATE INDEX IF NOT EXISTS idx_wm_thread ON webmentions(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_posts_thread ON posts(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_threads_updated ON threads(updated_at DESC);

-- Life layer — the "my life" surface (Phase 4). Shares the same D1 instance
-- as the forum so the whole system is one database, one Loom audit trail,
-- one pickle-name privacy model. A life event is anything worth remembering:
-- a relationship conversation, a health check, a weekly reflection, a goal
-- mark. Rendered by LifeSurface in the workspace portal.
-- `visibility` (default private): the life log is private by default — only
-- the author's DID can read private events; family events are visible to the
-- household; public events are readable by anyone.
CREATE TABLE IF NOT EXISTS life_events (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL,                 -- conversation | health | reflection | goal | note
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  author_did  TEXT NOT NULL,                 -- did:key, never a real name
  tags        TEXT NOT NULL DEFAULT '[]',    -- JSON array
  visibility  TEXT NOT NULL DEFAULT 'private', -- private | family | public
  week_start  TEXT,                          -- ISO date of the week (for the weekly view)
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_life_author ON life_events(author_did, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_life_week ON life_events(week_start);

-- Governed-event retry queue (Gap 3). The Loom is the audit trail — a
-- silently dropped governed event is a credibility breach. When the Loom
-- write fails, the event is persisted here and flushed by a DO alarm.
CREATE TABLE IF NOT EXISTS pending_events (
  id         TEXT PRIMARY KEY,
  kind       TEXT NOT NULL,
  payload    TEXT NOT NULL,                  -- JSON: the event body
  attempts   INTEGER NOT NULL DEFAULT 0,
  next_at    INTEGER NOT NULL,               -- epoch ms: when to retry
  created_at INTEGER NOT NULL
);

-- IP rate limits for the unauthenticated endpoints (webmention) — a flood of
-- unique source/target pairs must be capped.
CREATE TABLE IF NOT EXISTS rate_limits (
  ip           TEXT NOT NULL,
  bucket       TEXT NOT NULL,                -- 'webmention'
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip, bucket, window_start)
);

-- Notifications — in-app only for v1 (Phase D). A reply/mention/accept on a
-- thread the user participated in pushes a row + a WebSocket message.
CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  recipient  TEXT NOT NULL,                  -- did:key
  thread_id  TEXT NOT NULL,
  post_id    TEXT,
  kind       TEXT NOT NULL,                  -- reply | accept | mention
  read       INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notif_recipient ON notifications(recipient, read, created_at DESC);

-- Full-text search (Phase B) — D1 ships SQLite's FTS5 module. Threads and
-- posts indexed separately so a search matches both a question title and an
-- answer's body. Populated by triggers on insert/update.
CREATE VIRTUAL TABLE IF NOT EXISTS threads_fts USING fts5(title, body, content='threads', content_rowid='rowid');
CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(body, content='posts', content_rowid='rowid');

CREATE TRIGGER IF NOT EXISTS threads_ai AFTER INSERT ON threads BEGIN
  INSERT INTO threads_fts(rowid, title, body) VALUES (new.rowid, new.title, new.body);
END;
CREATE TRIGGER IF NOT EXISTS threads_ad AFTER DELETE ON threads BEGIN
  INSERT INTO threads_fts(threads_fts, rowid, title, body) VALUES ('delete', old.rowid, old.title, old.body);
END;
CREATE TRIGGER IF NOT EXISTS threads_au AFTER UPDATE ON threads BEGIN
  INSERT INTO threads_fts(threads_fts, rowid, title, body) VALUES ('delete', old.rowid, old.title, old.body);
  INSERT INTO threads_fts(rowid, title, body) VALUES (new.rowid, new.title, new.body);
END;
CREATE TRIGGER IF NOT EXISTS posts_ai AFTER INSERT ON posts BEGIN
  INSERT INTO posts_fts(rowid, body) VALUES (new.rowid, new.body);
END;
CREATE TRIGGER IF NOT EXISTS posts_ad AFTER DELETE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, body) VALUES ('delete', old.rowid, old.body);
END;