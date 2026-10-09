# ADR 0004: Non-Compensatory Governor

**Status:** Accepted
**Date:** 2026-10-02
**Deciders:** William R. Johnson, P31 Labs
**Supersedes:** None
**Superseded by:** None

## Context

The generation tetrahedron needs a Governor to cut slop between the Dreamer's
candidates and the Shaper's canon application. The naive approach is an LLM
judge that ranks candidates by a scalar score. The research ("When the Judge
Should Not Decide," EL-DGR, 2026) is unambiguous:

- An LLM judge with 60% pairwise agreement is **harmful** if it can
  unilaterally overwrite consensus.
- The fix is to "**bound the judge's blast radius** rather than trying to make
  it accurate."
- An unconstrained scalar judge is ~10 points worse than majority on a
  confirmation split.

## Decision

The Governor is a **non-compensatory falsifier**, not a ranker:

- It applies hard, deterministic rules and marks each candidate
  **admissible** or **inadmissible**.
- A single rule violation flips the whole candidate — no compensation.
- It does **not** rank; the Center selects among admissible survivors by the
  deterministic score (a tie-break, never a judge).
- No LLM has unilateral selection authority.

**Admissibility rules** (ANDed in `classifyAdmissibility`):
1. **Unknown type** — every node `type` must be in the closed registry enum.
2. **No binding** — the tree must bind to ≥1 grounded entity or action
   (`bindingScore ≥ 0.5`).
3. **Token violation** — every token must be `p31.*`-namespaced AND in the
   component's allowed contract.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| **LLM judge (scalar)** | Worse than no selection; can unilaterally overwrite consensus. |
| **Learned ranker** | Needs training data the system does not yet have; bootstrapping problem. |
| **Human-only** | Does not scale; the point is to close the loop automatically. |

## Consequences

**Positive:**
- The Governor cannot be gamed by a confident hallucination.
- A clean-but-unbound candidate is correctly rejected (structure does not
  rescue an inert surface).
- The Center's selection is deterministic and auditable.

**Negative:**
- Live verification initially rejected 4/4 candidates (the Dreamer emitted
  invalid tokens). This is correct behavior — it forced the Dreamer-prompt fix
  (include the per-component token map). A sloppy Dreamer yields zero
  survivors, which is honest but requires the Dreamer to be fed the vocabulary.

## Compliance

- EL-DGR: "bound the judge's blast radius."
- The 1/3-overlap corroboration (ADR 0001) is the gate-level version of the
  same principle.