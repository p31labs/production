/**
 * api/session/[id]/room.ts — the WebSocket upgrade into the SessionRoom DO.
 *
 * Pages cannot host a Durable Object class, so this Function is the seam: it
 * reads the identity claim, fails closed when it is absent (401), and
 * otherwise forwards the upgrade request to the room Worker's SessionRoom via
 * the SESSION_ROOM binding. The room is scoped to one session (the [id]
 * param); the DO name IS the session id.
 */
import type { Env } from '../../../_lib/ledger';

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const did = request.headers.get('x-p31-did');
  if (!did) {
    // Fail closed: no identity claim, no room. The room is never anonymous.
    return Response.json({ error: 'missing identity claim (x-p31-did)' }, { status: 401 });
  }

  if (!env.SESSION_ROOM) {
    return Response.json({ error: 'SESSION_ROOM binding is not configured' }, { status: 503 });
  }

  const sessionId = String((params as { id?: string | string[] }).id ?? '');
  if (!sessionId) {
    return Response.json({ error: 'missing session id' }, { status: 400 });
  }

  const stub = env.SESSION_ROOM.get(env.SESSION_ROOM.idFromName(sessionId));
  // The DO accepts the WebSocket (or answers /phase); forward as-is.
  return stub.fetch(request);
};