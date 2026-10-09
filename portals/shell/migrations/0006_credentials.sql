-- 0006_credentials.sql — per-user provider credentials (BYOK).
-- The key is AES-256-GCM at rest: ciphertext + iv, never a plaintext column.
-- The fingerprint (sha256(key).slice(0, 12)) identifies a credential without
-- ever revealing it. revoked_at set = revoked.

CREATE TABLE IF NOT EXISTS credentials (
  id TEXT PRIMARY KEY,
  did TEXT NOT NULL,
  provider TEXT NOT NULL,
  ciphertext BLOB NOT NULL,
  iv BLOB NOT NULL,
  fingerprint TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  revoked_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_credentials_did
  ON credentials (did, provider) WHERE revoked_at IS NULL;