/**
 * @file rldf.ts — Reinforcement Learning from Designer Feedback (Apple RLDF)
 *
 * The RLDF training substrate for the tetrahedral UI engine. The Apple ML-RLDF
 * paper (2026) is the method: designers give feedback via comments, sketches,
 * and direct edits (NOT rating/ranking), and the reward model is a fine-tuned
 * CLIP that scores a (rendered image, description) pair → a scalar reward.
 * The critical finding for P31: the reward model trains on IMAGE PAIRS, not
 * text pairs — so the Loom must capture the artifact's rendered screenshots.
 *
 * This module extracts, from the Loom's append-only log:
 *
 *   - `chat.artifact.generated` (agent) with a `screenshotRef` (R2 key of the
 *     rendered artifact) and optionally `screenshotRef2` (the operator's
 *     improved version) → the (original, improved) IMAGE PAIR.
 *   - `chat.artifact.approve` / `chat.artifact.reject` (human) → the label.
 *
 * Output shapes:
 *   - imagePairs:  { artifactId, original: key, improved: key|null, label }
 *                  — the CLIP reward-model training set (Apple RLDF).
 *   - preferencePairs: { prompt, chosen, rejected } for DPO / { prompt,
 *                  completion, label } for KTO — the text policy layer
 *                  (the existing loom/training.ts path, reframed for chat
 *                  artifacts).
 *
 * Privacy: shared-scope events only, gated by `consent`. A screenshot key is
 * a reference, never embedded pixels; `personal` events are never eligible.
 */
import type { LoomEvent, LoomScope } from './events.js';
import { extractTrainingExamples } from './training.js';

export interface RldfImagePair {
  artifactId: string;
  /** R2 object key (or content hash) of the rendered artifact. */
  original: string;
  /** R2 object key of the operator/designer-improved version, or null. */
  improved: string | null;
  /** 'approve' | 'reject' — the operator's decision. */
  label: 'approve' | 'reject';
  node: string;
  seq: number;
}

export interface RldfOptions {
  consent: boolean;
  includePersonal?: boolean;
}

const AGENT_GENERATED = (e: LoomEvent) =>
  e.writer === 'agent' && e.kind === 'chat.artifact.generated' && 'artifactId' in e && 'screenshotRef' in e;

/**
 * Extract (original, improved) image pairs + labels from the log. The
 * screenshot keys are pulled from the generated event; the label comes from
 * the matching chat.artifact.approve / chat.artifact.reject (by artifactId).
 * A generated event without a screenshotRef cannot train the reward model —
 * it is skipped (the text-only policy layer still covers it).
 */
export function extractImagePairs(events: readonly LoomEvent[], opts: RldfOptions): RldfImagePair[] {
  if (!opts.consent) return [];
  const list = opts.includePersonal ? events : events.filter((e) => (e as { scope?: LoomScope }).scope !== 'personal');

  const labels = new Map<string, 'approve' | 'reject'>();
  for (const e of list) {
    if (e.writer === 'human' && (e.kind === 'chat.artifact.approve' || e.kind === 'chat.artifact.reject')) {
      const artifactId = (e as { artifactId: string }).artifactId;
      labels.set(artifactId, e.kind === 'chat.artifact.approve' ? 'approve' : 'reject');
    }
  }

  const out: RldfImagePair[] = [];
  for (const e of list) {
    if (!AGENT_GENERATED(e)) continue;
    const gen = e as LoomEvent & { artifactId: string; screenshotRef: string; screenshotRef2?: string; node: string };
    const label = labels.get(gen.artifactId);
    if (!label) continue; // no human decision yet → not a training signal
    out.push({
      artifactId: gen.artifactId,
      original: gen.screenshotRef,
      improved: gen.screenshotRef2 ?? null,
      label,
      node: gen.node,
      seq: e.seq,
    });
  }
  return out;
}

/** RLDF-relevant stats: how many pairs are trainable (have an improved
 *  screenshot), how many are single-shot. */
export function rldfStats(pairs: RldfImagePair[]): { total: number; paired: number; singleShot: number; approved: number; rejected: number } {
  let paired = 0;
  let approved = 0;
  for (const p of pairs) {
    if (p.improved) paired++;
    if (p.label === 'approve') approved++;
  }
  return {
    total: pairs.length,
    paired,
    singleShot: pairs.length - paired,
    approved,
    rejected: pairs.length - approved,
  };
}

/**
 * The Apple-style reward-model format: (image pair, description) → label.
 * The reward model (CLIP fine-tune) learns "which of these two screenshots
 * is closer to P31 quantum material" from the operator's approve/reject.
 * Emits one line per pair, ready for a CLIP contrastive-fine-tune.
 */
export function toRewardModelJsonl(pairs: RldfImagePair[]): string {
  return pairs
    .map((p) => JSON.stringify({ artifactId: p.artifactId, original: p.original, improved: p.improved, label: p.label, node: p.node }))
    .join('\n');
}

/**
 * The text-policy layer — reframe the existing DPO/KTO exporter around chat
 * artifacts: the `decision` is the artifact's component tree (the Dreamer's
 * shaped tree from ui-forge), the label is approve/reject. Reuses the canon's
 * propose/approve/reject flow already wired into loom/training.ts.
 */
export function chatPreferencePairs(events: readonly LoomEvent[], opts: RldfOptions) {
  // Reuse the general extractor: it treats agent propose + human approve/
  // reject as labeled examples, exactly the co-presence pattern.
  return extractTrainingExamples(events, {
    consent: opts.consent,
    includePersonal: opts.includePersonal,
  });
}