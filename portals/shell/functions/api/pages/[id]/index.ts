/**
 * api/pages/[id] — read, patch (title), and act (move/trash/restore) on one page.
 *
 * Deletion is a trash move: trashed_at is set on the page and its whole parent
 * chain (descendants via parent_page_id), never a blast. Restore clears it.
 */
import { append, type Env } from '../../../_lib/ledger';
import type { BusEvent } from '../../../../src/bus/events';

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const pageId = String(params.id);
  try {
    const row = await env.DB.prepare(
      `SELECT id, space_id, parent_page_id, title, author_did, trashed_at, created_at
       FROM pages WHERE id = ?1`,
    ).bind(pageId).first();
    if (!row) {
      return Response.json({ error: 'page not found' }, { status: 404 });
    }
    return Response.json({ page: row });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'read failed' }, { status: 500 });
  }
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const pageId = String(params.id);
  let body: { title?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof body.title !== 'string') {
    return Response.json({ error: 'title required' }, { status: 400 });
  }
  try {
    await env.DB.prepare('UPDATE pages SET title = ?1 WHERE id = ?2').bind(body.title, pageId).run();
    return Response.json({ ok: true, id: pageId, title: body.title });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'patch failed' }, { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const pageId = String(params.id);
  let body: { action?: string; spaceId?: string; parentPageId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    switch (body.action) {
      case 'move': {
        await env.DB.prepare(
          'UPDATE pages SET space_id = ?1, parent_page_id = ?2 WHERE id = ?3',
        ).bind(body.spaceId ?? null, body.parentPageId ?? null, pageId).run();
        return Response.json({ ok: true, id: pageId, action: 'move' });
      }

      case 'trash': {
        // The trash move: mark the page and every descendant (parent chain) as
        // trashed_at. Not a blast — restore reverses it.
        const now = Date.now();
        await env.DB.prepare(
          `WITH RECURSIVE trashed(id) AS (
             SELECT ?1
             UNION
             SELECT p.id FROM pages p JOIN trashed t ON p.parent_page_id = t.id
           )
           UPDATE pages SET trashed_at = ?2 WHERE id IN (SELECT id FROM trashed) AND trashed_at IS NULL`,
        ).bind(pageId, now).run();
        await append(env, { type: 'page.deleted', sessionId: '', pageId } as BusEvent, { sessionId: '', face: 'chat' });
        return Response.json({ ok: true, id: pageId, trashed_at: now });
      }

      case 'restore': {
        await env.DB.prepare('UPDATE pages SET trashed_at = NULL WHERE id = ?1').bind(pageId).run();
        await append(env, { type: 'page.restored', sessionId: '', pageId } as BusEvent, { sessionId: '', face: 'chat' });
        return Response.json({ ok: true, id: pageId, action: 'restore' });
      }

      default:
        return Response.json({ error: 'unknown action' }, { status: 400 });
    }
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'action failed' }, { status: 500 });
  }
};