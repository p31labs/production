# The Loom — Full Market Launch Prep

**Status:** launch-prep package, 2026-09-23. Research + verified repo state.
Every external claim is sourced (see `market-launch-prep-research.md`); anything
flagged ⚠️ requires re-verification or human review before use.

## What this package is

A launch plan for the **Loom** (loom.p31ca.org) — the hash-chained, co-presence
agent governance layer — distinct from the Andromeda/IEP launch docs in
`docs/launch/` (school product) and `docs/enterprise-launch/` (Google/Anthropic/
Kilo engineering placements). The Loom is the **governance product**: the
reference implementation of the 2026 agent-governance stack.

## Index

| Doc | Purpose |
|---|---|
| `README.md` (this) | the full plan, one screen |
| `positioning.md` | the category, the claim, the one-paragraph |
| `messaging.md` | narrative spine + asset copy (one-pager, video script) |
| `pricing.md` | the family-first pricing model |
| `funding.md` | the grant pipeline with deadlines |
| `timeline.md` | the sequenced launch timeline |
| `checklist.md` | the launch gate: what must be true to go public |

## The one-sentence launch thesis

The Loom is the governance layer the 2026 standards and the EU AI Act are
demanding — a hash-chained, append-only audit trail with enforced co-presence
("Lumi proposes, the human decides") and post-quantum identity — live in
production, family-scoped, self-hosted, independently verifiable. It is the
only family-first agent governance stack, and it is launch-ready before the
standard takes full effect (EU AI Act high-risk logging applies 2 Dec 2027 / 2 Aug 2028 — staged by the Digital Omnibus Reg (EU) 2026/1744; Art 50 transparency already operative).

## The three launch tracks (run in parallel)

1. **Evidence track** (P0, blocking) — one real family session with signed
   consent; the 3-minute video (proposal → pause → decision); the live
   `/api/loom/verify` chain widget on both sites. This is the proof that
   answers "who uses this?" — currently **nobody outside the founding team**
   (the 2026-09-23 session was an operator pilot; see
   `docs/concierge-session-1.md`).
2. **Funding track** (deadline-driven) — Humanity AI (Oct 21, 2026), Hewlett
   (ongoing), Sentient (rolling), NLnet/NGI, accessibility accelerators.
   Grants are the primary revenue channel for a nonprofit.
3. **Distribution track** — open-source core (Apache-2.0/MIT), the public
   educational demo ("why co-presence matters"), the chain-verification widget,
   and standards-community participation (IETF WIMSE).

## The launch gate (must be true to go public)

- [x] ✅ **Security remediated 2026-09-23:** the exposed Cloudflare Access
      service token was rotated via the API (secret version 1→2); Pages secret
      `CF_ACCESS_CLIENT_SECRET` updated; project redeployed; old secret now
      rejected (`HTTP 302`); plaintext credential scrubbed from
      `downloads/Executing the review s fixes…txt`.
- [ ] **One real family session** with a **signed consent release** (current
      form is a template — `docs/concierge-consent-release.md`).
- [ ] **3-minute video** (proposal → pause → decision) filmed with consent.
- [ ] **Observation window** is no longer dormant: ≥ 1 real family traffic
      agent event (currently `KEEP OBSERVING`, window 6.4h < 72h).
- [ ] Live chain-verification widget live on p31ca.org + phosphorus31.org.
- [ ] Donation form simplified (the 1.6% → +52% conversion lever) — revenue
      path for a zero-revenue nonprofit.

## See also

- `docs/POSITIONING.md` — the strategic frame (the category P31 owns)
- `docs/PRODUCTION-READINESS.md` — what's ready vs. the gaps (P0 = concierge test)
- `docs/PROOF-OF-BEHAVIOR.md` — technical compliance mapping
- `docs/GOVERNANCE.md` — the enforcement + observation-window doctrine
- `docs/launch/market-launch-prep-research.md` — the deep web research base
- `docs/master-prompts/GRANTS-SME.md`, `INCOME-SME.md` — the funding/income lanes