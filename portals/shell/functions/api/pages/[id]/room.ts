/**
 * api/pages/[id]/room.ts — the WebSocket upgrade into the PageRoom DO.
 *
 * Pages cannot host a Durable Object class, so this Function is the seam: it
 * reads the identity claim, fails closed when it is absent (401), and otherwise
 * forwards the upgrade request to the PageRoom via the PAGE_ROOM binding. The
 * DO name IS the page id.
 */
import type { Env } from '../../../_lib/ledger';

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const did = request.headers.get('x-p31-did');
  if (!did) {
    return Response.json({ error: 'missing identity claim (x-p31-did)' }, { status: 401 });
  }

  const pageId = String(params.id);
  const ns = (env as { PAGE_ROOM?: DurableObjectNamespace }).PAGE_ROOM;
  if (!ns) {
    return Response.json({ error: 'PAGE_ROOM binding is not configured' }, { status: 503 });
  }

  return ns.get(ns.idFromName(pageId)).fetch(request);
};