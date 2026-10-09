/**
 * api/audit/export.ts — the tamper-evident audit log export (Wave 3, Pro+).
 *
 * GET (session cookie required) → application/x-ndjson of the did's stream
 * events for today, one JSON object per line, with a SHA-256 of the
 * concatenated lines appended as the final line. The client can verify by
 * dropping the final line, hashing the remainder, and comparing.
 *
 * Format:
 *   {"id":"…","did":"did:key:…","event_type":"agent.start","payload":{…},"created_at":"…"}
 *   …
 *   {"_audit_sha256":"<hex of everything above>","count":N}
 *
 * The Pro+ gate lives in the UI (the menu item is Pro-gated and prompts to
 * upgrade on Free); the entitlement worker is the hard quota enforcement.
 */
import { readDayAudit, sha256Hex } from '../../_lib/audit';
import type { SessionData } from '../../_middleware';

interface AuditExportEnv {
  AUTH_DB?: D1Database;
}

export const onRequestGet: PagesFunction<AuditExportEnv, string, SessionData> = async ({ env, data }) => {
  const session = data as SessionData;
  const did = session.did;
  if (!did) {
    return Response.json({ error: 'authentication required — sign in with a passkey first' }, { status: 401 });
  }
  if (!env.AUTH_DB) return Response.json({ error: 'AUTH_DB not configured' }, { status: 500 });

  const rows = await readDayAudit(env.AUTH_DB, did);
  const lines = rows.map((row) =>
    JSON.stringify({
      id: row.id,
      did: row.did,
      event_type: row.event_type,
      payload: JSON.parse(row.payload_json),
      created_at: row.created_at,
    }),
  );
  const body = lines.join('\n') + (lines.length > 0 ? '\n' : '');
  const hash = await sha256Hex(body);
  const ndjson = body + JSON.stringify({ _audit_sha256: hash, count: rows.length }) + '\n';

  return new Response(ndjson, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Content-Disposition': 'attachment; filename="ui-forge-audit.jsonl"',
      'X-Audit-Sha256': hash,
    },
  });
};