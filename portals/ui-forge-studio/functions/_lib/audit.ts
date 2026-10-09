/**
 * _lib/audit.ts — the tamper-evident audit trail (Wave 3, Pro+).
 *
 * Every ForgeEvent the stream emits is INSERTed into the `audit_log` D1 table
 * (best-effort, never blocks the stream). `/api/audit/export` reads it back as
 * NDJSON with a SHA-256 of the concatenated lines appended as the final line.
 */
import type { ForgeEvent } from '../../src/lib/events';

export interface AuditEnv {
  AUTH_DB?: D1Database;
}

/** One row in the audit_log table. */
export interface AuditRow {
  id: string;
  did: string;
  event_type: string;
  payload_json: string;
  created_at: string;
}

/** INSERT a ForgeEvent into the audit log (fire-and-forget, best-effort). */
export async function logAuditEvent(db: D1Database | undefined, did: string | null | undefined, ev: ForgeEvent): Promise<void> {
  if (!db || !did) return;
  try {
    await db
      .prepare('INSERT INTO audit_log (id, did, event_type, payload_json, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), did, ev.type, JSON.stringify(ev), new Date(ev.at ?? Date.now()).toISOString())
      .run();
  } catch {
    // audit is best-effort — a write failure must never break the pipeline
  }
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Read the day's audit rows for a DID, oldest first. */
export async function readDayAudit(db: D1Database, did: string): Promise<AuditRow[]> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const { results } = await db
    .prepare(
      'SELECT id, did, event_type, payload_json, created_at FROM audit_log WHERE did = ? AND created_at >= ? ORDER BY created_at ASC',
    )
    .bind(did, start.toISOString())
    .all<AuditRow>();
  return results;
}