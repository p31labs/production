/**
 * @file training.ts — LUMI ecosystem training core.
 *
 * The Loom's append-only event log is the training substrate: every agent
 * `propose` followed by a human `approve`/`reject` is a labeled training
 * example, exactly the KurrentDB "event streams are the training data"
 * pattern. This module is PURE (no LLM on the critical path, no side effects)
 * — it extracts examples, compresses them (SEC-style), builds a parameter-free
 * replay memory, retrieves relevant experience at inference time, and scores
 * the co-presence invariant that is Lumi's defining constraint.
 *
 * Privacy rule: only `shared` scope events may be used for training, and only
 * when `consent` is true. `personal` events are never eligible for training
 * (they can be used for local experience replay of that individual, but never
 * for fine-tuning — matching the COPPA / People-First Chatbot posture).
 *
 * The writer-per-kind rule set is IMPORTED from the gate (HUMAN_KINDS /
 * AGENT_KINDS) so the co-presence score can never drift from the gate.
 */

import type { LoomEvent, LoomScope } from './events.js';
import { HUMAN_KINDS, AGENT_KINDS } from './gate.js';

export interface TrainingOptions {
  /** Only shared-scope events are eligible. */
  consent: boolean;
  /** Context window (events before the propose) included in each example. */
  contextWindow?: number;
  /** Default: shared only. Set true to include personal (replay-only) events. */
  includePersonal?: boolean;
  /** Retrieval relevance floor (0..1); hits below it are dropped. */
  minReplayScore?: number;
  /** Recency bonus (0..1) — recent experiences are weighted toward the top. */
  recencyWeight?: number;
}

export interface TrainingExample {
  /** The agent's propose event (the decision). Narrowed to the propose
   *  variant so `.body` is typed — the extraction path only pushes propose
   *  events here via `isPropose`. */
  decision: LoomEvent & { id: string; node: string; body: unknown };
  /** The labeled outcome from a human: 'approve' or 'reject'. */
  label: 'approve' | 'reject';
  /** The context events (preceding window), already scope-filtered. */
  context: LoomEvent[];
  /** The human's deciding event. */
  humanEvent: LoomEvent;
  /** Proposal node + id, for provenance. */
  node: string;
  proposalId: string;
}

export interface CompressedExperience {
  task: string;
  context: string;
  decision: string;
  outcome: 'approve' | 'reject';
  seq: number;
}

export interface CoPresenceReport {
  /** 0..1 — how well the transcript respected the co-presence invariant. */
  score: number;
  /** Writer-per-kind violations (an agent emitting a human-only kind). */
  violations: string[];
  approved: number;
  rejected: number;
  pending: number;
  /** Fraction of decided proposals that were approved (Lumi's acceptance). */
  acceptance: number;
}

/** Discriminant-checked narrowing helpers (no unsafe union casts). */
function isPropose(event: LoomEvent): event is LoomEvent & { id: string; node: string; body: unknown } {
  return event.writer === 'agent' && event.kind === 'propose';
}
function isDecision(event: LoomEvent): event is LoomEvent & { proposal: string } {
  return event.writer === 'human' && (event.kind === 'approve' || event.kind === 'reject');
}

/** Scope filter: personal events are never eligible for training. */
function eligible(events: readonly LoomEvent[], includePersonal: boolean): LoomEvent[] {
  return events.filter((e) => {
    const scope = (e as { scope?: LoomScope }).scope;
    if (scope === 'personal' && !includePersonal) return false;
    return true;
  });
}

/**
 * Extracts labeled (context, decision) training examples from the log.
 * For each agent `propose` that a human later `approve`d or `reject`ed, the
 * context is the preceding `contextWindow` events; the label is the human's
 * decision. Proposals that never reached a human decision are excluded (a
 * pending proposal is not a training signal — co-presence requires the human
 * to decide).
 */
export function extractTrainingExamples(
  events: readonly LoomEvent[],
  opts: TrainingOptions,
): TrainingExample[] {
  if (!opts.consent) return [];
  const list = eligible(events, opts.includePersonal ?? false);
  const window = opts.contextWindow ?? 8;

  // First pass: collect the human decision for each proposal id (last wins).
  const byId = new Map<string, { human: LoomEvent; label: 'approve' | 'reject' }>();
  for (const event of list) {
    if (!isDecision(event)) continue;
    const label = event.kind === 'approve' ? 'approve' : 'reject';
    byId.set(event.proposal, { human: event, label });
  }

  // Second pass: build examples with the preceding context window.
  const out: TrainingExample[] = [];
  for (let i = 0; i < list.length; i++) {
    const event = list[i];
    if (!isPropose(event)) continue;
    const decided = byId.get(event.id);
    if (!decided || decided.human.seq < event.seq) continue; // no decision, or decision precedes
    const start = Math.max(0, i - window);
    out.push({
      decision: event,
      label: decided.label,
      context: list.slice(start, i),
      humanEvent: decided.human,
      node: event.node,
      proposalId: event.id,
    });
  }
  return out;
}

/** SEC-style compression: distill a trajectory to a four-field unit. */
export function compressExperience(example: TrainingExample): CompressedExperience {
  const context = example.context.map((e) => `${e.writer}:${e.kind}`).join(' → ');
  const body = example.decision.body;
  const decision =
    typeof body === 'string' ? body : (() => { try { return JSON.stringify(body ?? {}); } catch { return '{}'; } })();
  return {
    task: `${example.node} (${example.proposalId.slice(0, 8)})`,
    context,
    decision,
    outcome: example.label,
    seq: example.decision.seq,
  };
}

/** Builds the parameter-free replay memory (episodic/procedural). */
export function buildReplayMemory(
  events: readonly LoomEvent[],
  opts: TrainingOptions,
): CompressedExperience[] {
  return extractTrainingExamples(events, opts).map(compressExperience);
}

/** Token overlap scorer for parameter-free retrieval. */
function overlap(a: string, b: string): number {
  const ta = new Set(a.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const tb = new Set(b.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

/**
 * Retrieves the top-k most relevant past experiences for a query.
 * Applies a relevance floor (default 0.2) and an optional recency bonus so
 * common-word noise and stale experiences don't surface. Parameter-free,
 * privacy-preserving, deterministic.
 */
export function retrieveReplay(
  memory: CompressedExperience[],
  query: string,
  k = 3,
  opts: Pick<TrainingOptions, 'minReplayScore' | 'recencyWeight'> = {},
): CompressedExperience[] {
  const minScore = opts.minReplayScore ?? 0.2;
  const recencyWeight = opts.recencyWeight ?? 0.1;
  const maxSeq = memory.reduce((m, e) => Math.max(m, e.seq), 0);

  return memory
    .map((exp) => ({
      exp,
      score: overlap(query, `${exp.task} ${exp.context} ${exp.decision}`),
      recency: maxSeq > 0 ? exp.seq / maxSeq : 1,
    }))
    .filter((x) => x.score >= minScore)
    .sort((a, b) => (b.score + recencyWeight * b.recency) - (a.score + recencyWeight * a.recency))
    .slice(0, k)
    .map((x) => x.exp);
}

/**
 * The co-presence reward: how well a transcript honored the invariant that
 * Lumi proposes and the human decides. Writer-per-kind compliance is checked
 * against the GATE's HUMAN_KINDS/AGENT_KINDS (single source). Acceptance is
 * tracked per proposal id (last decision wins), so retries cannot inflate it.
 */
export function coPresenceScore(events: readonly LoomEvent[]): CoPresenceReport {
  const violations: string[] = [];
  for (const e of events) {
    if (e.writer === 'agent' && HUMAN_KINDS.has(e.kind)) {
      violations.push(`agent emitted human-only kind '${e.kind}' at seq ${e.seq}`);
    }
    if (e.writer === 'human' && AGENT_KINDS.has(e.kind)) {
      violations.push(`human emitted agent-only kind '${e.kind}' at seq ${e.seq}`);
    }
  }

  const proposals = events.filter((e) => e.writer === 'agent' && e.kind === 'propose');
  const proposalIds = new Set(proposals.map((e) => (e as { id: string }).id));
  const decisions = new Map<string, 'approve' | 'reject'>();
  for (const e of events) {
    if (!isDecision(e) || !proposalIds.has(e.proposal)) continue; // orphan decisions ignored
    decisions.set(e.proposal, e.kind === 'approve' ? 'approve' : 'reject');
  }
  let approved = 0;
  for (const d of decisions.values()) if (d === 'approve') approved++;
  const rejected = decisions.size - approved;
  const decided = decisions.size;
  const pending = proposals.length - decided;
  const decidedRatio = proposals.length > 0 ? decided / proposals.length : 1;
  const acceptance = decided > 0 ? approved / decided : 0;

  let score = 0.5 * decidedRatio + 0.5 * acceptance;
  if (violations.length > 0) score = 0;

  return { score, violations, approved, rejected, pending, acceptance };
}

/** Formats an example for instruction fine-tuning (the KurrentDB pattern). */
export function toInstructionExample(example: TrainingExample): {
  context: string;
  decision: string;
  outcome: 'approve' | 'reject';
} {
  const body = example.decision.body;
  return {
    context: example.context.map((e) => `${e.writer}:${e.kind}`).join(' | '),
    decision: typeof body === 'string' ? body : JSON.stringify(body ?? {}),
    outcome: example.label,
  };
}

/**
 * Preference-pair exporter for DPO/KTO training. When the log has both an
 * approved and a rejected proposal for the same context window, emits a
 * (prompt, chosen, rejected) DPO pair; when only a single signal exists,
 * falls back to KTO-shaped { prompt, completion, label } (approve=1, reject=0).
 */
export function exportPreferencePairs(
  events: readonly LoomEvent[],
  opts: TrainingOptions,
): { prompt: string; chosen?: string; rejected?: string; completion?: string; label?: 0 | 1 }[] {
  if (!opts.consent) return [];
  const examples = extractTrainingExamples(events, opts);
  const out: { prompt: string; chosen?: string; rejected?: string; completion?: string; label?: 0 | 1 }[] = [];

  // Group examples by context signature (node) so we can pair approve/reject.
  const byNode = new Map<string, TrainingExample[]>();
  for (const ex of examples) {
    const arr = byNode.get(ex.node) ?? [];
    arr.push(ex);
    byNode.set(ex.node, arr);
  }

  for (const [node, group] of byNode) {
    const prompt = group[0].context.map((e) => `${e.writer}:${e.kind}`).join(' | ') || `on ${node}`;
    const approved = group.find((e) => e.label === 'approve');
    const rejected = group.find((e) => e.label === 'reject');
    if (approved && rejected) {
      out.push({ prompt, chosen: JSON.stringify(approved.decision.body ?? {}), rejected: JSON.stringify(rejected.decision.body ?? {}) });
    } else if (approved) {
      out.push({ prompt, completion: JSON.stringify(approved.decision.body ?? {}), label: 1 });
    } else if (rejected) {
      out.push({ prompt, completion: JSON.stringify(rejected.decision.body ?? {}), label: 0 });
    }
  }
  return out;
}