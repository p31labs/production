/**
 * api/bus/stream — live SSE stream of the durable ledger. Pushes every
 * newly-emitted event as `event: <type>\ndata: <json>\n\n` with an SSE `id:`
 * (the ledger row id) so clients can resume from their last seen event via
 * the `Last-Event-ID` header. Polls the ledger on a heartbeat (the durable-
 * consistent approach: the ledger is the source of truth, SSE is the delivery).
 */
import { rowToEvent, type Env } from '../../_lib/ledger';

const HEARTBEAT_MS = 800;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const encoder = new TextEncoder();
  let closed = false;

  // Resume cursor, in ledger-id space (the poll predicate is `id > ?1` — an
  // epoch-ms seed would match no row: autoincrement ids are small integers).
  //   1. ?since=<id>  — the client's last seen row; closes the hydrate→connect gap.
  //   2. Last-Event-ID — EventSource reconnect resume.
  //   3. otherwise    — the ledger's newest row: deliver only what arrives after connect.
  const url = new URL(request.url);
  const sinceParam = url.searchParams.get('since');
  const lastEventId = request.headers.get('Last-Event-ID');
  let cursor = 0;
  if (lastEventId) {
    cursor = Number(lastEventId) || 0;
  } else if (sinceParam != null && Number.isFinite(Number(sinceParam))) {
    cursor = Math.max(0, Number(sinceParam));
  } else {
    const last = await env.DB.prepare('SELECT id FROM bus_events ORDER BY id DESC LIMIT 1').first<{ id: number }>();
    cursor = last?.id ?? 0;
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const poll = async () => {
        try {
          const rows = await env.DB.prepare(
            'SELECT * FROM bus_events WHERE id > ?1 ORDER BY id ASC LIMIT 500',
          ).bind(cursor).all();
          for (const raw of rows.results as unknown[]) {
            const row = raw as { id: number };
            const ev = rowToEvent(row as never);
            const frame = `id: ${row.id}\nevent: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`;
            if (!closed) controller.enqueue(encoder.encode(frame));
          }
          if ((rows.results as unknown[]).length > 0) {
            const last = rows.results[rows.results.length - 1] as { id: number };
            cursor = last.id;
          }
        } catch { /* transient — retry next heartbeat */ }
        if (!closed) controller.enqueue(encoder.encode(': keep-alive\n\n'));
      };

      const timer = setInterval(poll, HEARTBEAT_MS);
      void poll();

      request.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(timer);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    },
  });
};