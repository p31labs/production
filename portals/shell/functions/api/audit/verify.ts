/**
 * api/audit/verify — recompute and confirm the ledger hash chain over a
 * `?from=&to=` id range. Each row's `prev_hash`/`hash` are recomputed from the
 * canonical payload and compared; a single mismatch marks the range invalid.
 */
import { canonicalJson, sha256Hex, ZERO_HASH, type BusRow, type Env } from '../../_lib/ledger';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  let where = '';
  const binds: unknown[] = [];
  if (from) {
    where += ' AND id >= ?';
    binds.push(Number(from) || 0);
  }
  if (to) {
    where += ' AND id <= ?';
    binds.push(Number(to) || 0);
  }

  const rows = await env.DB.prepare(
    `SELECT * FROM bus_events WHERE 1=1${where} ORDER BY created_at ASC, id ASC`,
  ).bind(...binds).all<BusRow>();

  let prev = ZERO_HASH;
  if (from) {
    const prior = await env.DB.prepare(
      'SELECT hash FROM bus_events WHERE id < ? ORDER BY id DESC LIMIT 1',
    ).bind(Number(from) || 0).first<{ hash: string }>();
    prev = prior?.hash ?? ZERO_HASH;
  }

  let valid = true;
  for (const e of rows.results ?? []) {
    if (e.prev_hash !== prev) {
      valid = false;
      break;
    }
    const payload = JSON.parse(e.payload_json) as Record<string, unknown>;
    const canonicalBody = canonicalJson({ type: e.event_type, ...payload });
    const h = await sha256Hex(`${prev}|${canonicalBody}`);
    if (h !== e.hash) {
      valid = false;
      break;
    }
    prev = e.hash;
  }

  return Response.json({ valid });
};