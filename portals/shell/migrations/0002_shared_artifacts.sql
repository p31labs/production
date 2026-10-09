-- 0002_shared_artifacts.sql — the artifact sharing / durable tier.
--
-- One row per explicit share. The ledger event (artifact.shared /
-- artifact.persisted) audits the share and the content hash; the bytes live
-- here, bounded by expires_at and reaped by the retention sweep.

CREATE TABLE IF NOT EXISTS shared_artifacts (
  share_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  artifact_key TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  author_did TEXT NOT NULL DEFAULT '',
  retention_secs INTEGER NOT NULL DEFAULT 604800,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shared_artifacts_expires ON shared_artifacts (expires_at);
CREATE INDEX IF NOT EXISTS idx_shared_artifacts_session_key ON shared_artifacts (session_id, artifact_key);
