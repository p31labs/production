-- P31 Monetization — auth D1 schema (OAuth 2.1 / RFC 8707 migration, docs/ZERO-TRUST.md §4)
-- Apply with: wrangler d1 execute p31-monetization-auth --remote --file=migrations/0001_auth.sql

-- Passkey persistence (docs/ZERO-TRUST.md §Passkey persistence).
-- public_key is the base64url-encoded COSE public key; transports is a JSON array.
CREATE TABLE IF NOT EXISTS passkeys (
  credential_id TEXT PRIMARY KEY,      -- base64url credential ID
  public_key    TEXT NOT NULL,         -- base64url COSE public key
  counter       INTEGER NOT NULL DEFAULT 0,
  did           TEXT NOT NULL,         -- bound did:key
  transports    TEXT NOT NULL DEFAULT '[]',
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_passkeys_did ON passkeys(did);

-- OAuth 2.1 role-token issuance audit / session state (docs/ZERO-TRUST.md §4:
-- "D1 binding ... for OAuth authorization codes / session state"). One row per
-- issued audience-bound token, keyed by jti, mirroring the app_roles audit trail.
CREATE TABLE IF NOT EXISTS oauth_token_issuances (
  jti        TEXT PRIMARY KEY,         -- RFC 7519 jti of the issued token
  did        TEXT NOT NULL,            -- subject (did:key)
  role       TEXT NOT NULL,            -- viewer | operator | admin
  aud        TEXT NOT NULL,            -- RFC 8707 audience (portal origin)
  issued_at  INTEGER NOT NULL,         -- unix seconds
  expires_at INTEGER NOT NULL          -- unix seconds
);
CREATE INDEX IF NOT EXISTS idx_oauth_issuances_did ON oauth_token_issuances(did, issued_at);