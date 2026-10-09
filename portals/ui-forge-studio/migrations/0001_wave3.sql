-- Migration 0001 — UI Forge Studio Wave 3 (passkey auth + metering + audit).
-- Applied to the p31-auth D1 database (AUTH_DB binding). Table names avoid
-- collision with apps/auth (which owns `users` on this shared database).
-- Apply with: npx wrangler d1 migrations apply p31-auth --remote

-- WebAuthn credentials bound to a did:key.
CREATE TABLE IF NOT EXISTS passkeys (
  id TEXT PRIMARY KEY,                -- WebAuthn credential id (base64url)
  did TEXT NOT NULL,                  -- the did:key this passkey is bound to
  public_key TEXT NOT NULL,           -- hex of the COSE public key bytes
  counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT,                    -- JSON array of authenticator transports
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_passkeys_did ON passkeys(did);

-- Pending WebAuthn challenges (registration + login), short-TTL.
CREATE TABLE IF NOT EXISTS challenges (
  challenge TEXT PRIMARY KEY,
  did TEXT,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_challenges_expiry ON challenges(expires_at);

-- The studio's recorded tier per did (default 'free'). The entitlement worker
-- is the source of truth for quota; tier-set syncs happen through it.
CREATE TABLE IF NOT EXISTS forge_users (
  did TEXT PRIMARY KEY,
  tier TEXT NOT NULL DEFAULT 'free',
  created_at INTEGER NOT NULL
);

-- The tamper-evident stream-event trail (one row per emitted ForgeEvent).
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  did TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL              -- ISO-8601; the export window is UTC-day
);
CREATE INDEX IF NOT EXISTS idx_audit_did_created ON audit_log(did, created_at);