/**
 * api/search/index — FTS5 full-text search over the bus ledger.
 *
 * Query params:
 *   ?q=       (required — the FTS5 MATCH query; empty returns no results)
 *   ?scope=   (optional event_type prefix filter, e.g. thread|page|artifact|action)
 *   ?limit=   (default 20, max 100)
 *
 * Ranks by bm25(search_fts) and returns { results }.
 */
import type { Env } from '../../_lib/ledger';

export interface SearchResult {
  rowid: number;
  event_type: string;
  payload_json: string;
  session_id: string;
  did: string;
  face: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const scope = (url.searchParams.get('scope') ?? '').trim();
  const limit = Math.min(100, Number(url.searchParams.get('limit') ?? 20) || 20);

  if (!q) {
    return Response.json({ results: [] });
  }

  const sql = scope
    ? 'SELECT rowid, event_type, payload_json, session_id, did, face FROM search_fts WHERE search_fts MATCH ? AND event_type LIKE ? ORDER BY bm25(search_fts) LIMIT ?'
    : 'SELECT rowid, event_type, payload_json, session_id, did, face FROM search_fts WHERE search_fts MATCH ? ORDER BY bm25(search_fts) LIMIT ?';

  const stmt = scope
    ? env.DB.prepare(sql).bind(q, `${scope}%`, limit)
    : env.DB.prepare(sql).bind(q, limit);

  const rows = await stmt.all<SearchResult>();
  return Response.json({ results: rows.results });
};