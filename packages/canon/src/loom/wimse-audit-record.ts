/**
 * @p31ca/canon — loom/wimse-audit-record.ts
 *
 * Maps The Loom's hash-chained records to the WIMSE agent audit-record format
 * (IETF draft-gilda-wimse-agent-audit-record-00, 2026-09-20).
 *
 * The draft defines a record format for AI agent authorization decisions:
 *   - an in-toto predicate type, signed inside a DSSE envelope
 *   - the seven minimum audit fields the WIMSE AI Identity Management System
 *     requires
 *   - a canonicalization contract (RFC 8785 JCS — which the Loom already uses)
 *   - BOTH the authorization decision and the observed effect, with a derived
 *     three-valued agreement between them
 *
 * The Loom already records both sides: guardAgentEvent produces the decision
 * (allow / refuse), and the committed event (or the refusal sidecar entry) is
 * the observed effect. This module turns a ChainRecord + decision into the
 * WIMSE record, so the enterprise export is one function call.
 */

export interface WimseAuditSubject {
  agentId: string            // WIMSE identifier / did:key — Lumi's did:key
  principal?: string         // the responsible human, if any
}

export interface WimseAuditDecision {
  decision: 'allow' | 'refuse'
  policy?: string            // which scope/session rule applied
  reason?: string
}

/** Three-valued agreement: the observed effect vs the recorded decision. */
export type WimseAgreement = 'match' | 'mismatch' | 'unknown'

export interface WimseAuditRecord {
  spec: 'draft-gilda-wimse-agent-audit-record-00'
  subject: WimseAuditSubject
  decision: WimseAuditDecision
  effect: {
    observed: string          // canonical event or refusal payload
    seq: number
    ts: string
  }
  agreement: WimseAgreement
  canonicalization: 'RFC8785-JCS'
  chain: {
    prev_hash: string
    hash: string
  }
}

/**
 * Derive the three-valued agreement from a decision and whether an effect
 * (committed event) was observed.
 */
export function deriveAgreement(
  decision: 'allow' | 'refuse',
  observedEffect: boolean,
): WimseAgreement {
  if (decision === 'allow' && observedEffect) return 'match'
  if (decision === 'refuse' && !observedEffect) return 'match'
  return 'mismatch'
}

export interface ToWimseInput {
  record: import('./hash-chain.js').ChainRecord
  decision: WimseAuditDecision
  agentId: string
  principal?: string
  /** Whether the event was actually committed (allow) or refused (refuse). */
  effectObserved: boolean
}

/**
 * Convert one Loom ChainRecord into a WIMSE audit record. The decision comes
 * from the gate (guardAgentEvent); the effect is the committed event or the
 * refusal payload. The agreement is derived, never asserted.
 */
export function toWimseAuditRecord(input: ToWimseInput): WimseAuditRecord {
  const { record, decision, agentId, principal, effectObserved } = input
  return {
    spec: 'draft-gilda-wimse-agent-audit-record-00',
    subject: { agentId, principal },
    decision,
    effect: {
      observed: record.data,
      seq: record.seq,
      ts: record.ts,
    },
    agreement: deriveAgreement(decision.decision, effectObserved),
    canonicalization: 'RFC8785-JCS',
    chain: {
      prev_hash: record.prev_hash,
      hash: record.data, // canonical event; the chain hash is recomputed on verify
    },
  }
}