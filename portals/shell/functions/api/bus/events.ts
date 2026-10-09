/**
 * api/bus/events — replay events. Supports:
 *   ?limit=            (default 100, max 500)
 *   ?since=            (ISO timestamp or numeric ms — replay events after)
 *   ?before=<id>       (ledger id cursor — replay events strictly older, desc)
 *   ?session=<id>      (session filter, for thread-scoped pagination)
 *
 * Returns { events, hasMore, count }. When ?before= is present, `hasMore` is
 * computed from a `limit + 1` probe (one extra row fetched, then trimmed), so
 * the client learns whether another page exists without a second query.
 */
import { rowToEvent, type Env } from '../../_lib/ledger';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const limit = Math.min(500, Number(url.searchParams.get('limit') ?? 100));
  const since = url.searchParams.get('since');
  const before = url.searchParams.get('before');
  const session = url.searchParams.get('session');

  let rows;
  if (before) {
    // Paginated load-older: strictly older than the cursor id, newest-first.
    // Fetch limit+1 to probe hasMore, then trim.
    const beforeId = Number(before) || 0;
    const probe = limit + 1;
    if (session) {
      rows = await env.DB.prepare(
        'SELECT * FROM bus_events WHERE id < ?1 AND session_id = ?2 ORDER BY id DESC LIMIT ?3',
      ).bind(beforeId, session, probe).all();
    } else {
      rows = await env.DB.prepare(
        'SELECT * FROM bus_events WHERE id < ?1 ORDER BY id DESC LIMIT ?2',
      ).bind(beforeId, probe).all();
    }
    const results = (rows.results as unknown[]).slice(0, limit);
    const events = results.map((r) => rowToEvent(r as never));
    return Response.json({ events, hasMore: (rows.results as unknown[]).length > limit, count: events.length });
  }

  if (since) {
    const ts = Number(since) || Date.parse(since);
    rows = await env.DB.prepare(
      'SELECT * FROM bus_events WHERE created_at > ?1 ORDER BY created_at ASC, id ASC LIMIT ?2',
    ).bind(Number.isFinite(ts) ? ts : 0, limit).all();
  } else {
    rows = await env.DB.prepare(
      'SELECT * FROM bus_events ORDER BY created_at DESC, id DESC LIMIT ?1',
    ).bind(limit).all();
  }

  const events = (rows.results as unknown[]).map((r) => rowToEvent(r as never));
  return Response.json({ events, count: events.length });
};