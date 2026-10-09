/**
 * _lib/retention.ts — payload redaction for the hash-chained ledger.
 *
 * Retention never deletes a row (that would sever the chain). Instead it
 * replaces `payload_json` with a tombstone while leaving `id`, `prev_hash`,
 * and `hash` intact, so provenance survives even after the payload is gone.
 */
import type { BusRow, Env } from './ledger';

export interface Tombstone {
  redacted: true;
  type: string;
  hash: string;
}

/** Replace a row's payload with a tombstone: `{ redacted: true, type, hash }`. */
export function redactPayload(row: BusRow): string {
  const tombstone: Tombstone = {
    redacted: true,
    type: row.event_type,
    hash: row.hash,
  };
  return JSON.stringify(tombstone);
}

/** Redact the payload_json of matching rows, keeping hash/prev_hash/id intact. */
export async function runRetention(
  env: Env,
  opts: { beforeCreatedAt?: number; sessionId?: string },
): Promise<{ redacted: number }> {
  let where = " AND payload_json NOT LIKE '%\"redacted\":true%'";
  const binds: unknown[] = [];
  if (opts.beforeCreatedAt !== undefined) {
    where += ' AND created_at < ?';
    binds.push(opts.beforeCreatedAt);
  }
  if (opts.sessionId) {
    where += ' AND session_id = ?';
    binds.push(opts.sessionId);
  }

  const rows = await env.DB.prepare(
    `SELECT * FROM bus_events WHERE 1=1${where} ORDER BY created_at ASC, id ASC`,
  ).bind(...binds).all<BusRow>();

  let redacted = 0;
  for (const row of rows.results ?? []) {
    const tombstone = redactPayload(row);
    await env.DB.prepare(
      'UPDATE bus_events SET payload_json = ?1 WHERE id = ?2',
    ).bind(tombstone, row.id).run();
    redacted += 1;
  }
  return { redacted };
}