/**
 * api/pages/[id]/suggestions — D1-backed block-replacement suggestions.
 *
 * An agent proposes a replacement anchored to a range; a human accepts or
 * rejects it. The server is the only privileged writer. Suggestions are DURABLE
 * (a Pages Function is a per-request isolate — a module-level Map would make
 * accept/reject 404 on every real suggestion). The accept path is idempotent:
 * it checks `accepted IS NULL`, applies the replacement, sets `accepted = 1`,
 * and a second accept returns 409.
 */
import { append, type Env } from '../../../_lib/ledger';
import type { BusEvent } from '../../../../src/bus/events';

interface SuggestionRow {
  id: string;
  page_id: string;
  anchor_json: string;
  replacement: string;
  author_did: string;
  accepted: number | null;
  created_at: number;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const pageId = String(params.id);
  try {
    const rows = await env.DB.prepare(
      'SELECT id, page_id, anchor_json, replacement, author_did, accepted, created_at FROM suggestions WHERE page_id = ? ORDER BY created_at DESC',
    ).bind(pageId).all<SuggestionRow>();
    return Response.json({ suggestions: rows.results });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'list failed' }, { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const pageId = String(params.id);

  let body: { action?: string; suggestionId?: string; anchor?: unknown; replacement?: string; authorDid?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    if (body.action === 'accept' || body.action === 'reject') {
      const suggestionId = body.suggestionId;
      if (!suggestionId) return Response.json({ error: 'missing suggestionId' }, { status: 400 });

      const row = await env.DB.prepare(
        'SELECT id, page_id, replacement, author_did, accepted FROM suggestions WHERE id = ?',
      ).bind(suggestionId).first<SuggestionRow>();
      if (!row) return Response.json({ error: 'suggestion not found' }, { status: 404 });
      if (row.accepted != null) return Response.json({ error: 'suggestion already resolved' }, { status: 409 });

      const accepted = body.action === 'accept';
      await env.DB.prepare('UPDATE suggestions SET accepted = ? WHERE id = ?').bind(accepted ? 1 : 0, suggestionId).run();
      if (accepted) {
        /* apply the replacement (the PageRoom owns the content; the client
           applies it on receiving suggestion.resolved) */
      }

      await append(env, {
        type: 'suggestion.resolved',
        sessionId: '',
        pageId,
        suggestionId,
        accepted,
      } as BusEvent, { sessionId: pageId, did: row.author_did, face: 'chat' });

      return Response.json({ ok: true, suggestionId, accepted });
    }

    const replacement = body.replacement ?? '';
    const authorDid = body.authorDid ?? request.headers.get('x-p31-did') ?? '';
    const suggestionId = crypto.randomUUID();
    const anchor_json = body.anchor ? JSON.stringify(body.anchor) : '';

    await env.DB.prepare(
      'INSERT INTO suggestions (id, page_id, anchor_json, replacement, author_did, accepted, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)',
    ).bind(suggestionId, pageId, anchor_json, replacement, authorDid, Date.now()).run();

    await append(env, {
      type: 'suggestion.created',
      sessionId: '',
      pageId,
      suggestionId,
      anchor: body.anchor,
      replacement,
      authorDid,
    } as BusEvent, { sessionId: pageId, did: authorDid, face: 'chat' });

    return Response.json({ ok: true, suggestionId });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'suggestion failed' }, { status: 500 });
  }
};