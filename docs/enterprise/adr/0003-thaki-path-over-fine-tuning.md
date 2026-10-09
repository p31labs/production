# ADR 0003: THAKI Path over Fine-Tuning

**Status:** Accepted
**Date:** 2026-10-02
**Deciders:** William R. Johnson, P31 Labs
**Supersedes:** None
**Superseded by:** None

## Context

We need design-system-compliant component trees from a natural-language
backend spec. Two approaches: fine-tune a model to obey the design-system
grammar, or constrain decoding against a registry-derived schema. The THAKI
study (July 2026) measured both:

- Fine-tuning a 27B model (rank-64 LoRA) → **0/40 gate-pass**.
- Registry-derived constrained decoding → **39/40 gate-pass** (95% CI
  [0.868, 0.999]) with **zero training**.

The Constraint Tax is real: constraint raises validity but lowers fidelity
(component-F1 0.317 → 0.292). The bottleneck is candidate selection, not
generation — an oracle picking best-of-8 raises F1 from 0.286 to 0.445.

## Decision

Use the **THAKI path**:

- **Validity via the schema, not the weights.** The canon registry →
  `ui-schema.json` (closed component enum, per-component props,
  `additionalProperties:false`, `p31.*` tokens) is the enforcement layer.
- **"Reason free, constrain late."** The Dreamer generates freely; the Shaper
  validates and repairs deterministically. Constraint is applied after
  generation, not during — avoiding the Constraint Tax.
- **Selection is deterministic, not an LLM judge.** An unconstrained judge is
  worse than no selection (−4.5%); the Governor applies non-compensatory
  admissibility and the Center tie-breaks by the deterministic score.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| **Fine-tuning the generator** | Measured 0/40 gate-pass; the adapter changed generations but did not overturn the prior. |
| **LLM-judge selection** | Worse than no selection (−4.5%); selecting for gate-validity actively lowers fidelity. |
| **Constrained decoding during generation** | Raises validity but pays the Constraint Tax (lowers fidelity); the schema is applied by the Shaper instead. |

## Consequences

**Positive:**
- Zero heavy training for validity — deployable on Workers today.
- The Shaper's validation is auditable and deterministic.
- Selection cannot be gamed by a confident hallucination.

**Negative:**
- The Dreamer is noisy (measured 4 candidates → 1 admissible live); the
  token-map prompt narrowed it, but a schema-fed generation step (Workers AI
  `response_format`) is the natural follow-on.
- Validity and fidelity are decoupled — fidelity must come from the RLDF
  reward model (ADR 0005), not the schema.

## Compliance

- THAKI, "Validity is Not Fidelity" (July 2026).
- Constrained-decoding literature: CD eliminates structural failures
  (validity 78.6–92.9% → 100%) but reveals a semantic gap.