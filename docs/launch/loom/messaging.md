# The Loom — Messaging & Launch Assets (copy for production)

**Status:** 2026-09-23. Draft copy — human reviews before anything public.

## Narrative spine (reuse across all assets)

Families with neurodivergent members are the market AI has always skipped.
Consumer agents act on a family's behalf with no verifiable record, no identity
binding, and no human approval gate. The Loom is the governance layer that
fixes it: a hash-chained, post-quantum-identified, co-presence-enforced
runtime — Lumi proposes, a human decides, every step is independently
verifiable. Built in rural coastal Georgia by a neurodivergent founder, for
neurodivergent families.

## The demonstration (the "Gandalf" analog)

Lakera built a viral educational challenge ("Gandalf") that made AI security
understood. The Loom's analog: a public, shareable demo of *co-presence* —
"Lumi wants to add a bench to the street. Yes or no?" — that shows why the
human decides. Format candidates:
- A live one-screen demo at `loom.p31ca.org` (the proposal → decision loop)
- The chain-verification widget: `GET /api/loom/verify` rendered on the
  homepage as a live "chain status" chip
- A 3-minute video: proposal → pause → decision (⚠️ requires a signed consent
  release from a real participant)

## Asset checklist (what to produce)

| Asset | Status | Owner |
|---|---|---|
| One-pager (Loom) | 🔲 draft | concierge/human |
| 3-min video | 🔲 not filmed — no signed consent yet | human + family member |
| Chain-verification widget (both sites) | 🔲 build (2 days, $0) | dev |
| Simplified donation form | 🔲 build (1 day, $0) | dev |
| Nonprofit Organization Schema Markup (JSON-LD `@type: NGO`) | 🔲 build (1 day) | dev |
| Loom one-liner for p31ca.org homepage | 🔲 draft | human |
| Case study template | exists (`docs/launch/case-study-template.md`) | — |
| Agent-readiness manifest discoverability | ✅ live | — |

## Copy drafts

### Homepage one-liner (options)

1. "The Loom is the governance layer the 2026 standards demand — Lumi
   proposes, a human decides, and every step is a hash-chained record anyone
   can verify."
2. "AI that proves what it did. A chain your family can verify."
3. "Lumi suggests. A human decides. The record can't lie."

### Grant-application framing (Humanity AI lead)

Lead with the **governed** priority area, verbatim from `GRANTS-SME.md`: "how
AI is governed." Map the Loom to the funder's "community-led" criteria —
community = a family, governance = the chain, community-led = the human
approval gate. Evidence: the live chain (`/api/loom/verify`), the architecture
(not user counts). ⚠️ A real family session is required before submission; the
operator pilot is not family validation.

## What NOT to write

- No "X users" (there are none).
- No "family-validated" language (not yet true).
- No "SOC 2 / ISO 42001 certified" (not held).
- No fabrication of metrics, quotes, or citations. Delete rather than guess.