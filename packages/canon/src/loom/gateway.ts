/**
 * @file gateway.ts — the governance gateway for agent actions.
 *
 * Every agent action passes through `dispatchAgentAction`: verify the Lumi
 * capability token, evaluate against the scope declaration, and emit either a
 * propose (co-presence) or a structured refusal. The refusal is returned to
 * the caller (not a log kind yet — the Loom event interface is frozen); when
 * the frozen-interface owner approves a `refuse` kind, it becomes a log event.
 */

import type { ProposalAction, AgentScopeDeclaration, GuardDecision } from './scope.js';
import { ScopeGuard } from './scope.js';

export type AgentDispatchResult =
  | { allowed: true; action: ProposalAction }
  | { allowed: false; reason: string; refusal: true };

export interface AgentGateway {
  guard: ScopeGuard;
  scope: AgentScopeDeclaration;
}

export function createGateway(
  scope: AgentScopeDeclaration,
  verifyToken?: (token: string) => Promise<boolean> | boolean,
): AgentGateway {
  return { guard: new ScopeGuard(scope, verifyToken), scope };
}

/** Dispatches an agent action through the gateway (token → scope → propose/refuse). */
export async function dispatchAgentAction(
  gateway: AgentGateway,
  action: ProposalAction,
): Promise<AgentDispatchResult> {
  const decision: GuardDecision = await gateway.guard.guard(action);
  if (!decision.allowed) {
    return { allowed: false, reason: decision.reason ?? 'scope violation', refusal: true };
  }
  return { allowed: true, action };
}