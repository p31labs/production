# The Loom — Positioning (launch copy)

**Status:** 2026-09-23. Builds on `docs/POSITIONING.md`; research base in
`docs/launch/market-launch-prep-research.md`. ⚠️ re-verify claims before use.

## The category

Every AI vendor is building agents that **do things**. The market is now
paying for the layer that **proves what agents did** and **never lets an agent
act without a human decision**. That layer has a name in 2026 — the IETF's
agent-governance stack (Agent Audit Trail / AIC-JWT / AIP / MTAC, WIMSE
aligned) and the EU AI Act's automatic-logging requirement — and P31 runs a
live implementation of it. The Loom is the reference implementation.

## The claim (one paragraph)

The Loom is a live, production, family-scoped agent-governance runtime: a
hash-chained, append-only audit log any third party can independently verify
(`GET /api/loom/verify`), post-quantum identity (capability tokens), and
enforced co-presence — Lumi proposes, a human decides, never autonomously.
It ships before the EU AI Act's high-risk logging deadline and aligns with the
standards the IETF is writing. It is the only family-first agent governance
stack. Google, Anthropic, and OpenAI have models and platforms; none of them
can prove what an agent did to a family, in a chain the family can verify
themselves.

## The three differentiators (what P31 alone has, verified)

1. **Co-presence enforced at the gate** — "Lumi proposes, the human decides."
   This is the invariant under test in the concierge session. It reads as
   safety, not brokenness (2026-09-23 operator pilot: 31s propose→approve, no
   failure-mode language).
2. **Enforcement-first, not detection-only** — hash-chained append-only events
   with writer-per-kind (human vs agent kinds). Tamper-evident by
   construction, verifiable at `/api/loom/verify`. Position against the
   "detection tools" crowd.
3. **Family-scoped + sovereign** — self-hostable, family-owned, no vendor
   lock-in. Platform-independent governance (the Gartner guidance).

## Positioning against the field

| Player | Position | P31's counter |
|---|---|---|
| OpenAI "Presence" (Jul 2026) | enterprise agent deployment + governance, consulting-sold | enterprise-bound, vendor-locked; not family, not independently verifiable |
| Credo AI | "Trusted Leader in AI Governance", compliance packs | compliance tools, not an enforced runtime |
| Google CC / family AI (2026) | household coordination, permission controls | coordination, not tamper-evident governance; shared memory is not a verifiable chain |
| Ollie (family AI) | SOC 2, privacy-first assistant | a companion, not a governance substrate; SOC 2 ≠ independent chain verification |
| Detection/monitoring vendors | "security" dashboards, detection-only | the Loom is enforcement-first |

## The one sentence (for every asset)

> The Loom is the governance layer the 2026 standards demand — Lumi proposes,
> a human decides, and every step is a hash-chained record anyone can verify.

## What NOT to claim

- Do not claim family usage — the only session to date is an operator pilot.
- Do not claim "Proof-of-Behavior" is an IETF draft — it is P31's descriptive
  name (see `docs/PROOF-OF-BEHAVIOR.md`).
- Do not claim SOC 2, ISO 42001, or any certification not held.
- Do not out-feature OpenAI/Credo — lead with the category P31 owns.