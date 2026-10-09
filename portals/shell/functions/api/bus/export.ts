/**
 * api/bus/export — NDJSON audit export of the durable ledger. Each line is an
 * AAT-aligned audit record (agent_identity, action_class, outcome,
 * trust_level); the final line carries the SHA-256 of the concatenated JSONL
 * and the count. The trailing hash line is the tamper-evidence marker.
 */
import { rowToEvent, sha256Hex, toAatRecord, type Env, type BusRow } from '../../_lib/ledger';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const rows = await env.DB.prepare('SELECT * FROM bus_events ORDER BY created_at ASC, id ASC').all();
  const lines: string[] = [];
  for (const raw of rows.results as unknown[]) {
    const row = raw as BusRow;
    const ev = rowToEvent(row);
    const record = toAatRecord(row, {});
    lines.push(JSON.stringify({ ...record, ...ev }));
  }
  const body = lines.join('\n');
  const digest = await sha256Hex(body);
  const out = `${body}${body ? '\n' : ''}{"_audit_sha256":"${digest}","count":${lines.length}}\n`;

  return new Response(out, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson',
      'X-Audit-Sha256': digest,
      'Access-Control-Allow-Origin': '*',
    },
  });
};