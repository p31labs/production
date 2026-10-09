/**
 * shell/chat/collab/PresenceBar.tsx — the participant strip.
 *
 * A human avatar stack plus the agent chip. The agent's label comes from
 * useAgentPresence (server-authored, relayed by the room); the humans come
 * from the awareness channel. The per-did token split (model.usage grouped by
 * authorDid) feeds the meter in the studio face — it is not rendered here.
 */
import { usePresence } from './usePresence';
import { useAgentPresence } from './useAgentPresence';

export function PresenceBar() {
  const humans = usePresence();
  const agent = useAgentPresence();

  return (
    <div className="presence-bar" role="list" aria-label="Participants">
      {humans.map((h) => (
        <span key={h.did} className="presence-avatar" title={h.did} role="listitem">
          {h.did.slice(0, 2)}
        </span>
      ))}
      {agent.active && (
        <span className="presence-agent" title="Assistant" role="listitem">
          {agent.label ?? 'working'}
        </span>
      )}
    </div>
  );
}