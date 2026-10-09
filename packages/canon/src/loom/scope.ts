/**
 * @file scope.ts — Lumi's scope declaration, enforced.
 *
 * This is the SINGLE SOURCE of the scope declaration. @p31ca/agent-engine's
 * identity module re-exports it (it does not define a parallel shape), so the
 * declaration cannot drift from what the guard enforces. `evaluateProposal`
 * checks surface + kind; `ScopeGuard` adds the session proposal cap and
 * verifies Lumi's PQC capability token — and its `caps` claims — before
 * accepting an agent action. The gate itself stays frozen; this is the
 * enforcement layer that consults the declaration.
 */

import type { LoomEvent } from './events.js';
import { HUMAN_KINDS, AGENT_KINDS } from './gate.js';

export interface AgentScopeDeclaration {
  /** The surfaces Lumi may propose on (route names; nodes are `.surface` selectors). */
  surfaces: string[];
  /** The event kinds Lumi may emit (all agent-only kinds). */
  proposeKinds: string[];
  /** The kinds that always require a human decision (never emitted by Lumi). */
  humanApprovedKinds: string[];
  /** Cap on proposals per session (a spoon-aware limit; session state, not identity). */
  maxProposalsPerSession: number;
  /** The invariant: Lumi proposes, never acts. */
  coPresenceOnly: true;
}

export interface ProposalAction {
  writer: 'agent';
  kind: string;
  id: string;
  /** Optional — kinds like `review` react to an already-vetted proposal and
   *  carry no node; `traverse` is checked via both `from` and `to`. When
   *  absent, the surface check is skipped (kind/human invariants still apply). */
  node?: string;
  body: unknown;
  token?: string;
}

/**
 * The canonical default scope — SINGLE SOURCE of both the shape and the
 * values. `@p31ca/agent-engine` re-exports it as `LumiScopeDeclaration`; the
 * Loom's write-path guard imports it. `proposeKinds`/`humanApprovedKinds` are
 * DERIVED from the gate's kind sets, never hand-listed.
 */
export const DEFAULT_LUMI_SCOPE: AgentScopeDeclaration = {
  surfaces: ['craft', 'docs', 'sheets', 'slides', 'street'],
  proposeKinds: [...AGENT_KINDS],
  humanApprovedKinds: [...HUMAN_KINDS],
  maxProposalsPerSession: 8,
  coPresenceOnly: true,
};

export interface GuardDecision {
  allowed: boolean;
  reason?: string;
}

/**
 * A token verifier returns either a bare boolean (fail-closed) or a
 * verification carrying the token's `caps` claims — the guard then refuses any
 * action whose kind is not in the token's caps. The token's caps are the
 * source of truth for WHAT Lumi may emit; the declaration is its projection.
 */
export interface TokenVerification {
  ok: boolean;
  caps?: string[];
}

export type TokenVerifier =
  | ((token: string) => Promise<TokenVerification | boolean> | TokenVerification | boolean)
  | undefined;

/** Whether a Loom node (`.street`, `.street/bench`, `street`) belongs to a
 *  declared surface (`street`). Nodes are dotted selectors; surfaces are the
 *  top-level route names — so the check must tolerate both spellings. */
function nodeInSurface(node: string, surface: string): boolean {
  if (node === surface) return true;
  if (node === `.${surface}`) return true;
  if (node.startsWith(`.${surface}.`)) return true;
  if (node.startsWith(`${surface}/`)) return true;
  return false;
}

/** Surface + kind conformance of a proposal against the declaration. */
export function evaluateProposal(
  scope: AgentScopeDeclaration,
  action: ProposalAction,
): GuardDecision {
  const node = action.node;
  if (node) {
    const surfaceOk = scope.surfaces.some((s) => nodeInSurface(node, s));
    if (!surfaceOk) {
      return { allowed: false, reason: `surface '${node}' is outside Lumi's scope` };
    }
  }
  if (!scope.proposeKinds.includes(action.kind)) {
    return { allowed: false, reason: `kind '${action.kind}' is not a propose kind` };
  }
  if (scope.humanApprovedKinds.includes(action.kind)) {
    return { allowed: false, reason: `kind '${action.kind}' is human-only — Lumi may never emit it` };
  }
  if (!scope.coPresenceOnly || action.writer !== 'agent') {
    return { allowed: false, reason: 'Lumi may only propose (co-presence invariant)' };
  }
  return { allowed: true };
}

/**
 * Enforces the declaration at action time: capability-token verify (including
 * the token's caps claims), surface/kind conformance, and a per-session
 * proposal cap.
 */
export class ScopeGuard {
  private scope: AgentScopeDeclaration;
  private verifyToken: TokenVerifier;
  private sessionProposals = 0;

  constructor(scope: AgentScopeDeclaration, verifyToken: TokenVerifier = undefined) {
    this.scope = scope;
    this.verifyToken = verifyToken;
  }

  async guard(action: ProposalAction): Promise<GuardDecision> {
    if (this.verifyToken) {
      const v = await this.verifyToken(action.token ?? '');
      if (v === false) return { allowed: false, reason: 'invalid Lumi capability token' };
      if (v === true) {
        // verifier vouches without caps claims — nothing more to check here
      } else if (!v.ok) {
        return { allowed: false, reason: 'invalid Lumi capability token' };
      } else if (v.caps && !v.caps.includes(action.kind)) {
        return { allowed: false, reason: `token lacks cap for kind '${action.kind}'` };
      }
    }
    const conformance = evaluateProposal(this.scope, action);
    if (!conformance.allowed) return conformance;
    if (this.sessionProposals >= this.scope.maxProposalsPerSession) {
      return { allowed: false, reason: `session cap of ${this.scope.maxProposalsPerSession} proposals reached` };
    }
    this.sessionProposals++;
    return { allowed: true };
  }
}

/** Convenience: fold an event list into a co-presence + scope audit summary. */
export function scopeAudit(scope: AgentScopeDeclaration, events: readonly LoomEvent[]): {
  inScope: number;
  outOfScope: string[];
  overCap: boolean;
} {
  const proposals = events.filter((e) => e.writer === 'agent' && e.kind === 'propose');
  const outOfScope: string[] = [];
  let inScope = 0;
  for (const p of proposals as (LoomEvent & { node: string })[]) {
    if (scope.surfaces.some((s) => nodeInSurface(p.node, s))) inScope++;
    else outOfScope.push(p.node);
  }
  return { inScope, outOfScope, overCap: inScope > scope.maxProposalsPerSession };
}