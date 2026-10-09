# ADR 0005: RLDF CLIP Reward Model

**Status:** Accepted
**Date:** 2026-10-02
**Deciders:** William R. Johnson, P31 Labs
**Supersedes:** None
**Superseded by:** None

## Context

Validity is enforced by the schema (ADR 0003); **fidelity** — "what P31
quantum material actually looks like" — needs a learned signal. Rating/ranking
feedback is unreliable for design: designers agree only 49.2% of the time when
ranking, but 63.6% (sketch) to 76.1% (direct edit) when showing what they
want (Apple ML-RLDF, 2026). We need a reward model that learns the operator's
taste from concrete changes, not abstract quality scores.

## Decision

Use the **RLDF (Reinforcement Learning from Designer Feedback)** pattern:

- The reward model is a **fine-tuned CLIP** scoring (rendered image,
  description) → scalar reward.
- Training data is the **Loom's labeled artifact pairs**: `approve`/`reject`
  on `chat.artifact.generated`, with `screenshotRef` (original) and
  `screenshotRef2` (operator-improved) forming the (original, improved) pair.
- The reward model becomes the Governor's fidelity score — replacing the
  heuristic anti-slop rubric with learned P31 taste.

**Substrate already in place:**
- Loom v1.2 `chat.artifact.generated` carries optional
  `screenshotRef` / `screenshotRef2` (additive extension).
- `packages/canon/src/loom/rldf.ts` extracts the pairs.
- `packages/ui-forge/scripts/rldf-train.mjs` exports `reward-model.jsonl` +
  `pref.jsonl` (DPO/KTO), gated by `--consent` (shared-scope events only).

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| **Generic RLHF / ranking** | Designers agree only 49.2% when ranking; the signal is noise. |
| **Heuristic anti-slop rubric forever** | Static; cannot learn the operator's evolving taste. |
| **Fine-tune the generator** | ADR 0003 showed 0/40 gate-pass; fidelity is learned by a *separate* reward model, not the generator. |

## Consequences

**Positive:**
- The reward model learns *your* taste from your approvals/rejections.
- DPO/KTO text policy layer works today on the Loom's propose→approve/reject.
- Small-data regime: Apple's sketch-conditioned model beat GPT-5 with ~181
  annotations.

**Negative:**
- **No training data yet** — the Loom must accumulate real pairs before the
  reward model is meaningful.
- **PNG capture is not yet implemented** — the preview iframe is opaque-origin
  sandboxed, so today's capture is the serialized HTML fragment (feeds the
  text-policy layer), not an image. Image-pair training awaits html-to-image
  or an in-iframe canvas + `postMessage` (see STATUS.md).
- Training host required for the fine-tune (QLoRA, per LUMI-TRAINING.md).

## Compliance

- Apple ML-RLDF, "Improving User Interface Generation Models from Designer
  Feedback" (2026).
- `packages/canon/docs/LUMI-TRAINING.md` — QLoRA on a 360M–3B base, GGUF →
  llama.cpp on-device.