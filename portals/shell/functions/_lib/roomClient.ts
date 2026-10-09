/**
 * _lib/roomClient.ts — the server → room push for agent presence.
 *
 * The turn owns the agent's presence. It calls notifyAgentPhase at each phase
 * transition; the room relays it to every participant. The push is
 * fire-and-forget and wrapped in try/catch: a room failure must never fail a
 * turn, and the agent's presence does not depend on any one client staying
 * connected.
 */
import type { Env } from './ledger';

export type AgentPhase = string | null;

export async function notifyAgentPhase(env: Env, sessionId: string, phase: AgentPhase): Promise<void> {
  try {
    if (!env.SESSION_ROOM) return;
    const stub = env.SESSION_ROOM.get(env.SESSION_ROOM.idFromName(sessionId));
    await stub.fetch('https://room/phase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, phase }),
    });
  } catch {
    // Fire-and-forget: presence is never allowed into the turn's failure path.
  }
}