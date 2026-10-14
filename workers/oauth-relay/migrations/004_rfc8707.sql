-- P31 OAuth Relay — RFC 8707 resource indicators + RFC 9207 iss (2026-10-11)
-- Apply with: wrangler d1 execute p31-oauth --remote --file=migrations/004_rfc8707.sql

ALTER TABLE oauth_sessions ADD COLUMN resource TEXT;
ALTER TABLE oauth_tokens ADD COLUMN resource TEXT;