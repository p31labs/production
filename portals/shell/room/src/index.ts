/**
 * room/src/index.ts — the room Worker entry.
 *
 * A standalone Worker whose only job is to host the SessionRoom / PageRoom
 * Durable Objects (Pages cannot host a DO class). The Pages project reaches
 * the room through its bindings; this Worker's default fetch answers `/health`
 * and returns 404 for everything else. A WebSocket upgrade that reaches this
 * entry is a misconfiguration and must surface — it must NOT be silently
 * routed into a DO named `health`.
 */
import { SessionRoom, type RoomEnv } from './SessionRoom';
import { PageRoom } from './PageRoom';

export { SessionRoom, PageRoom };

export default {
  async fetch(request: Request, env: RoomEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return new Response('ok');
    }
    // No fallback DO: a bare fetch (or a misrouted upgrade) is a 404.
    return new Response('not found', { status: 404 });
  },
};