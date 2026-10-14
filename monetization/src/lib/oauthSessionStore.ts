/**
 * OAuth session state in D1 — issuance audit for OAuth 2.1 role tokens.
 *
 * docs/ZERO-TRUST.md §4 gates the OAuth 2.1 migration on a D1 binding "for
 * OAuth authorization codes / session state". Until the full
 * `@cloudflare/workers-oauth-provider` swap lands (filed in
 * docs/fix-plans/monetization-oauth21-provider-swap.md), every audience-bound
 * role token issued under the flag is recorded here by `jti`, mirroring the
 * existing app_roles audit-trail discipline (roles.ts header comment).
 */

import type { D1Database } from './d1Types';

export interface OAuthIssuanceRecord {
  jti: string;
  did: string;
  role: string;
  aud: string;
  issuedAt: number;
  expiresAt: number;
}

interface IssuanceRow {
  jti: string;
  did: string;
  role: string;
  aud: string;
  issued_at: number;
  expires_at: number;
}

export interface OAuthSessionStore {
  record(issuance: OAuthIssuanceRecord): Promise<void>;
  findByJti(jti: string): Promise<OAuthIssuanceRecord | null>;
}

export function createOAuthSessionStore(db: D1Database): OAuthSessionStore {
  return {
    async record(issuance) {
      await db
        .prepare(
          `INSERT OR REPLACE INTO oauth_token_issuances (jti, did, role, aud, issued_at, expires_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(issuance.jti, issuance.did, issuance.role, issuance.aud, issuance.issuedAt, issuance.expiresAt)
        .run();
    },
    async findByJti(jti) {
      const row = await db
        .prepare('SELECT * FROM oauth_token_issuances WHERE jti = ?')
        .bind(jti)
        .first<IssuanceRow>();
      if (!row) return null;
      return {
        jti: row.jti,
        did: row.did,
        role: row.role,
        aud: row.aud,
        issuedAt: row.issued_at,
        expiresAt: row.expires_at,
      };
    },
  };
}