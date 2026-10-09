/**
 * shell/chat/collab/usePresence.ts — the awareness hook.
 *
 * Reads the relayed presence for the HUMAN participants only (remote cursors).
 * The agent's own presence is a separate, server-authored channel — see
 * useAgentPresence. This hook never reads or writes the agent's state.
 */
import { useCollabStore, type RemotePresence } from './collabStore';

export interface HumanPresence {
  did: string;
  cursor?: { index: number; length: number };
}

export function usePresence(): HumanPresence[] {
  const presence = useCollabStore((s) => s.presence);
  const humans: HumanPresence[] = [];
  for (const entry of Object.values(presence)) {
    if (entry.agent) continue; // the agent is not a human participant
    humans.push({ did: entry.did, cursor: entry.cursor });
  }
  return humans;
}

export function useRemoteCursors(): Array<{ did: string } & { index: number; length: number }> {
  const presence = useCollabStore((s) => s.presence);
  const cursors: Array<{ did: string } & { index: number; length: number }> = [];
  for (const entry of Object.values(presence)) {
    if (entry.agent || !entry.cursor) continue;
    cursors.push({ did: entry.did, ...entry.cursor });
  }
  return cursors;
}