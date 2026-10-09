import { useState } from 'react';

interface ProposalCardProps {
  /** The proposal in plain language — one sentence, no jargon. */
  proposal: string;
  /** Lumi's rationale — the "why" of the proposal, shown as an expandable
   *  "Why this proposal?" detail. Optional: a proposal without a stated
   *  reason renders without the detail (the decision still stands). */
  reason?: string;
  /** The proposed body for the pre-decision diff. When provided alongside
   *  `currentBody`, a "see the change" expander shows current vs proposed. */
  proposedBody?: unknown;
  /** The current state the proposal would change, for the pre-decision diff. */
  currentBody?: unknown;
  /** Fires on Yes. Caller commits `approve`. */
  onApprove: () => void;
  /** Fires on Not yet. Caller commits `reject` with a friendly reason. */
  onReject: () => void;
  /** Which decision landed, or null while undecided. */
  decided: 'yes' | 'not-yet' | null;
  /** True while the celebration pulse is playing — the buttons stay mounted
   *  (so the AAF actions remain in the DOM) but are disabled. */
  celebrating?: boolean;
}

/**
 * Lumi's proposal, presented in plain language, with a two-answer decision.
 *
 * Design constraints (unchanged):
 *   - Two buttons only: "Yes, do it" / "Not yet". No third option — the
 *     child is not asked to reason or negotiate.
 *   - Both buttons are visually equal weight. "Not yet" is not styled as a
 *     warning, a cancel, or a lesser action.
 *   - Each button carries its own AAF action so tests and agents can find
 *     them independently.
 *   - The card never blocks a decision with a timer. No default, no
 *     auto-advance, no "if you do nothing" fallback.
 *
 * NEW (triple-polish): the co-presence loop is made tangible. An expandable
 * "Why this proposal?" surfaces Lumi's rationale (the explainability layer),
 * and an optional "See the change" expander shows current vs proposed (the
 * pre-decision diff). Both are opt-in reading surfaces — they never gate or
 * time the decision.
 */
export function ProposalCard({
  proposal,
  reason,
  proposedBody,
  currentBody,
  onApprove,
  onReject,
  decided,
  celebrating = false,
}: ProposalCardProps) {
  const [showWhy, setShowWhy] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const hasWhy = typeof reason === 'string' && reason.trim().length > 0;
  const hasDiff = proposedBody !== undefined && currentBody !== undefined;

  return (
    <div className="proposal-card" role="group" aria-label="Lumi's idea">
      <p className="proposal-text">{proposal}</p>

      {(hasWhy || hasDiff) && (
        <div className="proposal-details" role="group" aria-label="About this idea">
          {hasWhy && (
            <button
              type="button"
              className="proposal-detail-toggle"
              onClick={() => setShowWhy((v) => !v)}
              aria-expanded={showWhy}
              data-agent-kind="action"
              data-agent-action="proposal.why"
              data-agent-danger="none"
              data-agent-confirm="never"
            >
              {showWhy ? 'Hide why' : 'Why this proposal?'}
            </button>
          )}
          {showWhy && hasWhy && <p className="proposal-why">{reason}</p>}

          {hasDiff && (
            <button
              type="button"
              className="proposal-detail-toggle"
              onClick={() => setShowDiff((v) => !v)}
              aria-expanded={showDiff}
              data-agent-kind="action"
              data-agent-action="proposal.diff"
              data-agent-danger="none"
              data-agent-confirm="never"
            >
              {showDiff ? 'Hide the change' : 'See the change'}
            </button>
          )}
          {showDiff && hasDiff && (
            <div className="proposal-diff">
              <div className="proposal-diff-col">
                <span className="proposal-diff-head">Now</span>
                <pre className="proposal-diff-body">{preview(currentBody)}</pre>
              </div>
              <div className="proposal-diff-col proposal-diff-col--new">
                <span className="proposal-diff-head">Proposed</span>
                <pre className="proposal-diff-body">{preview(proposedBody)}</pre>
              </div>
            </div>
          )}
        </div>
      )}

      {(decided === null || celebrating) && (
        <div className="proposal-actions">
          <button
            type="button"
            className="proposal-action proposal-action--yes"
            onClick={onApprove}
            disabled={celebrating}
            data-agent-kind="action"
            data-agent-action="proposal.approve"
            data-agent-target="proposal"
            data-agent-danger="none"
            data-agent-confirm="never"
          >
            Yes, do it
          </button>
          <button
            type="button"
            className="proposal-action proposal-action--not-yet"
            onClick={onReject}
            disabled={celebrating}
            data-agent-kind="action"
            data-agent-action="proposal.defer"
            data-agent-target="proposal"
            data-agent-danger="none"
            data-agent-confirm="never"
          >
            Not yet
          </button>
        </div>
      )}
    </div>
  );
}

/** A short, safe text preview of a body — no model, no HTML, truncated. */
function preview(body: unknown): string {
  if (typeof body === 'string') return body.slice(0, 200);
  if (body === null || body === undefined) return '(nothing)';
  try {
    return JSON.stringify(body, null, 2).slice(0, 300);
  } catch {
    return String(body).slice(0, 200);
  }
}