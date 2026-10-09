/**
 * shell/chat/collab/useAgentPresence.ts — the agent's presence, read-only.
 *
 * The agent's phase is set server-side by the turn (notifyAgentPhase) and
 * relayed by the room. This hook only DERIVES the human label from the raw
 * phase — it never writes awareness state for the agent, because the client
 * cannot claim the agent is here. One source of truth: the turn.
 */
import { useCollabStore } from './collabStore';

export interface AgentPresence {
  /** The human label, or null when the turn is idle. */
  label: string | null;
  /** True while a turn is running (any phase). */
  active: boolean;
}

/** The raw phase → label mapping:
 *  phase.started('action') → thinking
 *  phase.started('response') → streaming
 *  tool:<name> → the tool label
 *  null → cleared
 */
function labelForPhase(phase: string | null): string | null {
  if (phase == null) return null;
  if (phase === 'action') return 'thinking';
  if (phase === 'response') return 'streaming';
  if (phase === 'paused') return 'paused';
  if (phase.startsWith('tool:')) return phase.slice(5);
  return phase;
}

export function useAgentPresence(): AgentPresence {
  const agentPhase = useCollabStore((s) => s.agentPhase);
  const label = labelForPhase(agentPhase);
  return { label, active: agentPhase != null };
}