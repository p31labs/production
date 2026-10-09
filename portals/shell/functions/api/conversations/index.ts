/**
 * api/conversations — the thread list, derived from the bus ledger.
 *
 * No separate conversations table: the ledger is the source of truth. A
 * conversation is a `session_id` with its `MAX(created_at)` as lastMessageAt.
 *
 * Pagination cursor is the tuple (last_message_at, session_id) — NOT a bare
 * timestamp — so two threads modified in the same millisecond never collide.
 *   ?before=<lastMessageAt ms>&session=<sessionId>&limit=<n>
 * The cursor is exclusive; `hasMore` is computed from a limit+1 probe.
 */
import type { Env } from '../../_lib/ledger';

interface ConversationRow {
  session_id: string;
  last_message_at: number;
  message_count: number;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const limit = Math.min(200, Number(url.searchParams.get('limit') ?? 50));
  const before = url.searchParams.get('before');   // last_message_at (ms)
  const session = url.searchParams.get('session'); // session_id tiebreaker

  const probe = limit + 1;

  let rows;
  if (before && session) {
    const at = Number(before) || 0;
    rows = await env.DB.prepare(
      `SELECT session_id, MAX(created_at) AS last_message_at, COUNT(*) AS message_count
       FROM bus_events
       WHERE session_id != ''
       GROUP BY session_id
       HAVING MAX(created_at) < ?1 OR (MAX(created_at) = ?1 AND session_id < ?2)
       ORDER BY last_message_at DESC, session_id DESC
       LIMIT ?3`,
    ).bind(at, session, probe).all();
  } else {
    rows = await env.DB.prepare(
      `SELECT session_id, MAX(created_at) AS last_message_at, COUNT(*) AS message_count
       FROM bus_events
       WHERE session_id != ''
       GROUP BY session_id
       ORDER BY last_message_at DESC, session_id DESC
       LIMIT ?1`,
    ).bind(probe).all();
  }

  const results = (rows.results as unknown[]).slice(0, limit) as ConversationRow[];
  const conversations = results.map((r) => ({
    id: r.session_id,
    lastMessageAt: r.last_message_at,
    messageCount: r.message_count,
  }));

  const last = conversations[conversations.length - 1];
  return Response.json({
    conversations,
    hasMore: (rows.results as unknown[]).length > limit,
    nextCursor: last ? { before: last.lastMessageAt, session: last.id } : null,
  });
};