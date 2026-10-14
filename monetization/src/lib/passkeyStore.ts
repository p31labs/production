/**
 * Passkey credential persistence — the store layer behind `src/lib/passkeys.ts`.
 *
 * docs/ZERO-TRUST.md §Passkey persistence: credentials historically lived in a
 * module-level `Map` (per-isolate, lost on redeploy). Production persistence
 * moves to D1 (`passkeys` table, schema in migrations/0001_auth.sql) via the
 * `AUTH_DB` binding. This module keeps the two implementations behind one
 * interface so the WebAuthn verification logic stays identical.
 */

import type { PasskeyCredential } from './passkeys';
import type { D1Database } from './d1Types';
import { b64urlToBytes, bytesToB64url } from './b64url';

export interface PasskeyStore {
  get(credentialId: string): Promise<PasskeyCredential | null>;
  listByDid(did: string): Promise<PasskeyCredential[]>;
  put(credential: PasskeyCredential): Promise<void>;
  setCounter(credentialId: string, counter: number): Promise<void>;
}

/** Per-isolate in-memory store — development/preview fallback, unchanged behavior. */
export function createMemoryPasskeyStore(): PasskeyStore {
  const map = new Map<string, PasskeyCredential>();
  return {
    async get(credentialId) {
      return map.get(credentialId) ?? null;
    },
    async listByDid(did) {
      return [...map.values()].filter((c) => c.did === did);
    },
    async put(credential) {
      map.set(credential.id, credential);
    },
    async setCounter(credentialId, counter) {
      const existing = map.get(credentialId);
      if (existing) existing.counter = counter;
    },
  };
}

/** Row shape of the `passkeys` D1 table (migrations/0001_auth.sql). */
interface PasskeyRow {
  credential_id: string;
  public_key: string;
  counter: number;
  did: string;
  transports: string;
  created_at: number;
}

function toCredential(row: PasskeyRow): PasskeyCredential {
  let transports: string[] = [];
  try {
    const parsed = JSON.parse(row.transports) as unknown;
    if (Array.isArray(parsed)) transports = parsed.filter((t): t is string => typeof t === 'string');
  } catch {
    // fall through with []
  }
  return {
    id: row.credential_id,
    publicKey: b64urlToBytes(row.public_key),
    counter: row.counter,
    transports,
    did: row.did,
    createdAt: row.created_at,
  };
}

/** D1-backed store — durable across deploys and isolates. */
export function createD1PasskeyStore(db: D1Database): PasskeyStore {
  return {
    async get(credentialId) {
      const row = await db
        .prepare('SELECT * FROM passkeys WHERE credential_id = ?')
        .bind(credentialId)
        .first<PasskeyRow>();
      return row ? toCredential(row) : null;
    },
    async listByDid(did) {
      const result = await db
        .prepare('SELECT * FROM passkeys WHERE did = ?')
        .bind(did)
        .all<PasskeyRow>();
      return (result.results ?? []).map(toCredential);
    },
    async put(credential) {
      await db
        .prepare(
          `INSERT OR REPLACE INTO passkeys (credential_id, public_key, counter, did, transports, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          credential.id,
          bytesToB64url(credential.publicKey),
          credential.counter,
          credential.did,
          JSON.stringify(credential.transports ?? []),
          credential.createdAt,
        )
        .run();
    },
    async setCounter(credentialId, counter) {
      await db
        .prepare('UPDATE passkeys SET counter = ? WHERE credential_id = ?')
        .bind(counter, credentialId)
        .run();
    },
  };
}