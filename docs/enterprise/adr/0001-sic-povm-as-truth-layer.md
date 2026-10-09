# ADR 0001: SIC-POVM as the Truth Layer

**Status:** Accepted
**Date:** 2026-10-02
**Deciders:** William R. Johnson, P31 Labs
**Supersedes:** None
**Superseded by:** None

## Context

The engine needs a verification mechanism for multi-agent design consensus.
Majority voting is unreliable — an unconstrained scalar judge buys only +1.0pp
over majority on some tasks and is ~10 points *worse* on a confirmation split
(EL-DGR, 2026). We need a mechanism that is **informationally complete**: it
cannot miss a design dimension because a single specialist was unavailable or
wrong.

## Decision

Use **SIC-POVM** semantics as the truth layer:

- Four measurement axes form a regular tetrahedron (Bloch sphere), with
  equiangular overlap |⟨ψⱼ|ψₖ⟩|² = 1/(d+1) = 1/3.
- **Informational completeness** — the four outcomes fully determine the state.
- An unmeasured axis is an **incomplete** state, not a default pass.

The four axes are the four `/vision` specialists:
`layout-parity` (structure), `sensory-safety` (coherence),
`identity-surface` (sovereignty), `motion-interaction` (interaction).

**1/3-overlap corroboration (sub-decision):** because the effects are
equiangular, a `critical` finding only gates when **≥2** specialists
independently flag it. One lone critic does not collapse the design. This is
the discrete analog of the equiangular overlap.

**Degraded measurement (sub-decision):** a review with `degraded:true`
(instrument fault) yields `needs-review`, never a silent pass — a
known-instrument-fault measurement updates the belief with lower confidence
(QBism).

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| **Majority voting** | Compensatory — a 3/4 vote can pass a design with a collapsed axis. Not informationally complete. |
| **Weighted sum** | Same problem — a high-scoring axis can compensate for a collapsed one. |
| **Unconstrained LLM judge** | Research shows it is worse than no selection on some splits; it can unilaterally overwrite consensus. |
| **Bayesian network** | No principled way to set the prior; SIC-POVM provides the geometry. |

## Consequences

**Positive:**
- A design with a collapsed axis (unavailable or below floor) is correctly
  incomplete — it does not silently pass.
- The 1/3-overlap rule gives a principled corroboration threshold.
- A degraded measurement is flagged for human review, not masked.

**Negative:**
- The gate can fail closed on platform flakiness (mitigated by the cross-model
  fallback chain in `vision.ts` and the neutral `unmeasured` response).
- Four measurements are required; a partial review is incomplete, not partial.

## Compliance

- "The definition of a SIC-POVM implies that it is informationally complete"
  — SIC-POVM literature.
- The Tetrahedron Protocol (Zenodo 2026-02-13) maps the geometry to Maxwell
  rigidity, Posner-molecule biology, and network topology.

## Follow-ups

- **Exit-code differentiation** — today all non-pass is exit `1`. Planned:
  `0` pass / `1` needs-revision / `2` incomplete / `3` needs-review, so a
  scripted loop can distinguish "regenerate with fixes" from "re-run the
  measurement".