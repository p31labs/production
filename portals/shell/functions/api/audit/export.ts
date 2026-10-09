/**
 * api/audit/export — a tamper-evident audit bundle for the durable ledger.
 *
 * Produces three artifacts: a `manifest` (with an `integrity_status` computed
 * from a real verify pass — never hardcoded), the raw event stream as
 * `events.jsonl` (one event per line), and a `checksums.sha256` manifest line.
 */
import { rowToEvent, sha256Hex, verifyChain, type BusRow, type Env } from '../../_lib/ledger';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const rows = await env.DB.prepare(
    'SELECT * FROM bus_events ORDER BY created_at ASC, id ASC',
  ).all();
  const events = (rows.results as unknown[]).map((raw) => raw as BusRow);

  const eventsJsonl = events.map((row) => JSON.stringify(rowToEvent(row))).join('\n');
  const eventsSha256 = await sha256Hex(eventsJsonl);

  const verifyResult = await verifyChain(env);
  const verified = verifyResult.valid;

  const manifest = {
    generated_at: new Date().toISOString(),
    total_entries: events.length,
    last_hash: verifyResult.last_hash,
    integrity_status: verified ? 'VERIFIED' : 'FAILED',
  };

  return Response.json(
    {
      manifest,
      bundle: {
        'events.jsonl': eventsJsonl,
        'checksums.sha256': `${eventsSha256}  events.jsonl\n`,
      },
    },
    { headers: { 'Access-Control-Allow-Origin': '*' } },
  );
};