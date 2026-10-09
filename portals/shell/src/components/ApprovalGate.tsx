/**
 * components/ApprovalGate.tsx — the human-in-the-loop approval gate.
 *
 * Wired to run.interrupted / run.resumed (AG-UI interrupt outcomes). When an
 * agent pauses before a consequential action, this gate renders with a risk
 * level: amber (medium) / red (high). Approving publishes run.resumed with
 * outcome approved; rejecting sends rejected. The run pauses until decided.
 */
import { useState } from 'react';
import { publish } from '../bus/client';
import type { BusEvent } from '../bus/events';
import { gateRequired, type Action, type Role } from '../shell/authz';

export interface ApprovalGateProps {
  sessionId: string;
  interruptId: string;
  reason: string;
  risk: 'medium' | 'high';
  pendingAction?: string;
  /** The action being gated, and the actor's role. When both are present and
   *  the role already holds the permission (admin deploying), the gate shows
   *  an auto-approve state instead of buttons. When `action` is absent, the
   *  gate renders as before (fail-closed: unknown action always gates). */
  action?: Action;
  role?: Role | null;
  onResolved?: (outcome: 'approved' | 'rejected' | 'modified') => void;
}

export function ApprovalGate({ sessionId, interruptId, reason, risk, pendingAction, action, role, onResolved }: ApprovalGateProps) {
  const [decision, setDecision] = useState<'approved' | 'rejected' | 'modified' | null>(null);
  const [busy, setBusy] = useState(false);

  // The authorization wiring: an action the role already holds needs no human
  // gate. `autoApproved` renders a compact "held by {role}" line instead of the
  // approve/reject buttons. Unknown action → gateRequired true → buttons stay.
  const autoApproved = action !== undefined && role !== null && role !== undefined && !gateRequired(role, action);

  const resolve = async (outcome: 'approved' | 'rejected' | 'modified') => {
    setBusy(true);
    setDecision(outcome);
    const ev: BusEvent = { type: 'run.resumed', sessionId, interruptId, outcome };
    await publish(ev);
    onResolved?.(outcome);
    setBusy(false);
  };

  return (
    <div className={`approval approval--${risk}`} role="alert" aria-live="assertive">
      <div className="approval__head">
        <span className="approval__badge">{risk === 'high' ? 'high risk' : 'needs approval'}</span>
        <span className="approval__reason">{reason}</span>
      </div>
      {pendingAction && <p className="approval__action">{pendingAction}</p>}
      {autoApproved ? (
        <p className="approval__auto" role="status">
          Auto-approved — <span className="approval__role">{role}</span> holds <span className="approval__perm">{action}</span>.
        </p>
      ) : (
      <>
      <div className="approval__buttons">
        <button
          type="button"
          className="approval__deny"
          onClick={() => resolve('rejected')}
          disabled={decision != null || busy}
          data-agent-kind="action"
          data-agent-action="approval.reject"
          data-agent-danger="high"
          data-agent-confirm="never"
        >
          Reject
        </button>
        <button
          type="button"
          className="approval__approve"
          onClick={() => resolve('approved')}
          disabled={decision != null || busy}
          data-agent-kind="action"
          data-agent-action="approval.approve"
          data-agent-danger="none"
          data-agent-confirm="never"
        >
          Approve
        </button>
      </div>
      {decision && <p className="approval__result">Run {decision === 'approved' ? 'resumed' : 'stopped'}.</p>}
      </>
      )}
    </div>
  );
}