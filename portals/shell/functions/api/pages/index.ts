/**
 * api/pages — list pages flat (cursor-paginated) and create pages.
 *
 * List: ?space=&before=&limit=. `before` is a created_at+id cursor (format
 * `{created_at}_{id}`), so the page after the cursor is deterministic under
 * (created_at DESC, id DESC). `space=standalone` selects pages with no space
 * (space_id IS NULL). `hasMore` is a limit+1 probe.
 */
import { append, type Env } from '../../_lib/ledger';
import type { BusEvent } from '../../../src/bus/events';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const space = url.searchParams.get('space');
  const before = url.searchParams.get('before');
  const limit = Math.min(200, Number(url.searchParams.get('limit') ?? 100));
  const probe = limit + 1;

  let where = '';
  const binds: unknown[] = [];
  if (space) {
    if (space === 'standalone') {
      where = ' WHERE space_id IS NULL';
    } else {
      where = ' WHERE space_id = ?';
      binds.push(space);
    }
  }
  if (before) {
    const sep = before.indexOf('_');
    const createdAt = Number(sep >= 0 ? before.slice(0, sep) : before) || 0;
    const id = sep >= 0 ? before.slice(sep + 1) : '';
    where += where ? ' AND' : ' WHERE';
    where += ' (created_at < ? OR (created_at = ? AND id < ?))';
    binds.push(createdAt, createdAt, id);
  }
  binds.push(probe);

  try {
    const rows = await env.DB.prepare(
      `SELECT id, space_id, parent_page_id, title, author_did, trashed_at, created_at
       FROM pages${where}
       ORDER BY created_at DESC, id DESC LIMIT ?`,
    ).bind(...binds).all();
    const results = (rows.results as unknown[]).slice(0, limit);
    return Response.json({ pages: results, hasMore: (rows.results as unknown[]).length > limit });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'list failed' }, { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: { spaceId?: string; parentPageId?: string; title?: string; authorDid?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const title = body.title ?? '';
  const authorDid = body.authorDid ?? '';

  try {
    await env.DB.prepare(
      `INSERT INTO pages (id, space_id, parent_page_id, title, author_did, trashed_at, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6)`,
    ).bind(id, body.spaceId ?? null, body.parentPageId ?? null, title, authorDid, createdAt).run();

    await append(env, {
      type: 'page.created',
      sessionId: '',
      pageId: id,
      spaceId: body.spaceId,
      parentPageId: body.parentPageId,
      title,
      authorDid,
    } as BusEvent, { sessionId: '', did: authorDid, face: 'chat' });

    return Response.json({ ok: true, id });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'create failed' }, { status: 500 });
  }
};