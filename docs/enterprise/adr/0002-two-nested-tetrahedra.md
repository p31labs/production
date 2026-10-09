# ADR 0002: Two Nested Tetrahedra

**Status:** Accepted
**Date:** 2026-10-02
**Deciders:** William R. Johnson, P31 Labs
**Supersedes:** None
**Superseded by:** None

## Context

The generation function and the verification function have opposing
instincts. A generator explores; a verifier cuts. Folding both into the same
agents ("one mind doing all four") collapses the separation the Tetrahedral
Agent Protocol requires. We need distinct generation and measurement surfaces.

## Decision

Run **two nested tetrahedra**:

1. **Generation tetrahedron** (`packages/ui-forge`) — Grounder → Dreamer →
   Governor → Shaper → Center. Four distinct vertices, one synthesis.
2. **Measurement tetrahedron** (`apps/phos/worker-ai-proxy`) — the four
   `/vision` specialists. They measure, they never generate.

The SIC-POVM gate (ADR 0001) is the link: the measurement tetrahedron feeds
the gate, the gate gates the generation output, the Center names the next
generation step.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| **Collapse to one tetrahedron** | The 4 `/vision` specialists used directly as the 4 generation agents — blurs roles; "one mind doing all four collapses them into mush." |
| **Single-agent generate+verify** | Confirms its own output; no independent verification (SOULSAFE Triad of Cognition violation). |

## Consequences

**Positive:**
- Generation and measurement are independently hardened (a generator failure
  does not corrupt the verifier, and vice versa).
- The measurement surface is reusable across surfaces (chat portal, forge,
  any UI).

**Negative:**
- Two codebases to maintain; the gate must be shared (`packages/ui-forge` is
  the shared home).
- More moving parts than a single-pass generator.

## Compliance

- Tetrahedral Agent Protocol (Mears, 2026): four separate vertices + a Center
  that is never a vertex.
- SOULSAFE (P31 Paper XIX): separation of concerns across AI systems.