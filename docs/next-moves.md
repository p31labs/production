# Next Moves — verified research + sequenced plan (2026-09-23)

**Status:** deep-web research pass + primary-source verification. Every claim
below is verified against a primary source (EUR-Lex, IETF datatracker, fund
sites) or marked ⚠️ as unverified. This supersedes any earlier date claims that
conflict.

---

## Critical correction (verified against EUR-Lex, 2026-09-23)

**The EU AI Act high-risk logging dates changed.** The **Digital Omnibus on AI
(Regulation (EU) 2026/1744, 8 Jul 2026, in force 27 Jul 2026)** amended Article
113(3)(c): high-risk Chapter III obligations — **including Article 12
record-keeping and Article 14 human oversight** — now apply:

- **2 December 2027** for Annex III systems (Art 6(2))
- **2 August 2028** for regulated products (Art 6(1) / Annex I)

**This means the previously published "Art 12 effective Aug 2, 2026" claim is
OUTDATED and has been corrected in these docs:** `POSITIONING.md`,
`PRODUCTION-READINESS.md`, `PROOF-OF-BEHAVIOR.md`,
`docs/launch/market-launch-prep-research.md`, `docs/launch/loom/README.md`,
`docs/enterprise-launch/positioning.md`.

**What remains operative now (2 Aug 2026):** the general application date,
**Article 50 transparency**, and GPAI (Chapter V) obligations. New Art 5
prohibitions apply 2 Dec 2026. This is the correct near-term compliance hook.

## IETF AAT revision (verified against datatracker, 2026-09-23)

The Agent Audit Trail draft is at **`draft-sharif-agent-audit-trail-04`
(2026-09-15)** — the research said -03; the current revision is -04. Revision
history matters for the Loom's alignment claim:

| Rev | Date | Adds |
|---|---|---|
| -01 | May 2026 | pre-execution recording, recording independence, deny reason codes, replay protection, external timestamp anchoring, content fingerprinting |
| -02 | ~Jul 2026 | Decision Reproducibility (Sec 13) — distinguishes record vs decision reproducibility (open-weight, temp-0, attested) |
| -03 | Aug 2026 | **Attestation Closure (Sec 13.6)** — digests must cover model weights, tokenizer, chat template, inference engine build, decoding config, numeric environment + `tokenizer_digest`, `chat_template_digest`, `engine_build_digest` |
| -04 | Sep 2026 | **ML-DSA-65 (FIPS 204) PQC signatures**, `signer_kid` (RFC 7638), trust-level assignment integrity (Sec 5.3), optional Merkle batch anchoring (Sec 6.4, RFC 6962) |

**Loom alignment:** already matches the SHA-256 + RFC 8785 JCS chaining, the
pre-execution gate (AAT -01 requirement for denials), and the PQC direction
(the Loom's capability tokens are already ML-DSA-65). **Open gap:** the propose
event does not carry model provenance (`model_id`, `tokenizer_digest`,
`chat_template_digest`, `engine_build_digest`) — needed for the -03
decision-reproducibility claim. This matters for Foresight / NLnet, not for
Humanity AI (governance framing).

## Market context (verified/sourced)

- Agent observability & governance: $1.68B (2026) → $8.62B (2031), 38.69% CAGR
  (Research and Markets, 2026)
- Agentic AI governance & policy mgmt: $15.6B (2026) → $173.1B (2034), 35.1%
  CAGR (Research and Markets)
- Gartner: by 2029 guardian agents eliminate ~half of incumbent risk/security
  systems protecting AI agents in >70% of orgs; by 2027 >70% of agent identity
  providers classify data sensitivity for scoped access
- Neurodivergent UX: 2026 ACM work establishes cognitive-fit metrics (not just
  usability) for neuroatypical users; NEST-UX (Oxford, Apr 2026) calls for
  clear, customizable, low-distress designs — the Loom's presentation controls
  + Calm mode implement exactly this

## Humanity AI deadline (verified)

- **Deadline: 2026-10-21, 7:59 PM ET** (4:59 PM PT) — confirmed on
  humanityai.ai, MacArthur Foundation, University of Utah, University at Albany.
  ⚠️ Re-verify on humanityai.ai before submission.
- $75K–$1M, ≤3 years; priority includes **how AI is governed**.

## Humanity AI eligibility (VERIFIED against humanityai.ai + IRS, 2026-09-23)

- **Lead organizations must have 501(c)(3) status.**
- **Individuals / informal groups** apply through a **fiscal sponsor** (a
  US-based 501(c)(3) applies as lead on the project's behalf and administers
  the grant) or join a **collaboration** led by a 501(c)(3).
- ✅ **P31 Labs' 501(c)(3) determination is CONFIRMED (2026-09-23).** The IRS
  determination letter has been received; `grant-pipeline-v2.json` records
  `determinationDate: "2026-09-23"`. P31 can now apply as a **direct lead
  applicant** — no fiscal sponsor required.
- **Application route:** direct lead, single organization (no collaboration),
  at **Tier 1 ($75K–$150K)** (sized for "an emerging organization launching an
  early initiative" or "a contained pilot"). Tier 2 ($150K–$500K) is possible
  if the proposal justifies dedicated staff/initiative scope.

---

## Sequenced next moves

### Move 1 — ✅ RESOLVED (2026-09-23): security incident closed
The exposed `lumi-write-2` service token was **rotated via the Cloudflare API**
(secret version 1→2, same client_id), the Pages secret `CF_ACCESS_CLIENT_SECRET`
updated, and the project redeployed. Old exposed secret → `HTTP 302` (rejected);
new secret → `/api/loom/verify` `valid:true` (16 events). The plaintext
credential was redacted from the downloads transcript. Full record:
`apps/loom/docs/TOKEN-ROTATION.md`.

### Move 2 — ✅ RESOLVED (2026-09-23): 501(c)(3) determination confirmed
IRS determination letter received (`grant-pipeline-v2.json`
`determinationDate: "2026-09-23"`). P31 applies to Humanity AI as a **direct
lead applicant**. Remaining: update the repo's "pending" phrasing (in
progress) and gather the evidence for Move 5.

### Move 3 — Run the real family session (🔴 blocking, human)
Recruit ONE family member (not the operator), sign the consent release
(`docs/concierge-consent-release.md` — fill in code name, check the video box),
run the concierge session with the rotated token, capture verbatim quotes +
CSAT/NPS + the 3-minute video (proposal → pause → decision). This is the
evidence the Humanity AI application needs. **Do not claim family validation
without it.**

### Move 4 — Extend the event schema for AAT -03/-04 alignment (🟡 technical, ~1–2 days)
Add optional model-provenance fields to the `LoomEvent` propose body
(`model_id`, `tokenizer_digest`, `chat_template_digest`, `engine_build_digest`)
so the chain supports the AAT decision-reproducibility claim. Not a Humanity AI
blocker; a differentiator for Foresight (Oct 31) and NLnet.

### Move 5 — Draft + submit Humanity AI (🟡 deadline-driven, Oct 21)
Use the narrative spine (`docs/launch/loom/messaging.md`), lead with "governed",
map community-led = family, chain = the log, human approval = the gate.
**Application route: direct lead applicant — 501(c)(3) determination confirmed
2026-09-23 (Move 2).** Tier 1 ($75K–$150K) unless the proposal justifies a
larger scope.
Evidence: the live chain (`/api/loom/verify`), the architecture, and Move 3's
real family session. Honest framing: "one family session completed" if Move 3
is done; otherwise "operator pilot completed; family session scheduled."

### Move 6 — Prepare the Foresight RFP (🟡 deadline Oct 31, $30K–$100K)
Frame: "the Loom as a reference implementation of the IETF Agent Audit Trail
(AAT), with decision reproducibility and attestation closure." Draft after
Move 4 so the technical claim is real.

### Move 7 — Re-verify every grant deadline before submission (⚠️ ongoing)
Humanity AI (Oct 21), Foresight (Oct 31), Sentient (rolling), NLnet (next call),
Coastal Georgia Foundation (2027). Deadlines shift; check the fund's site.

---

## Status matrix

| Track | Status | Next action |
|---|---|---|
| Security | ✅ **CLOSED 2026-09-23** | token rotated; Pages secret updated; redeployed |
| 501(c)(3) eligibility | ✅ **CONFIRMED 2026-09-23** | IRS determination letter received; apply as lead 501(c)(3) — no fiscal sponsor needed |
| Evidence | 🔴 BLOCKED | real family session + signed consent |
| UI/UX triple-polish | ✅ COMPLETE | 99 vitest + 42 e2e green |
| Legal dates | ✅ CORRECTED | Digital Omnibus dates applied to 6 docs |
| AAT alignment | 🟡 GAP | add model-provenance fields (Move 4) |
| Humanity AI | 🟡 READY (conditional) | draft; needs Move 3 evidence (family session) |
| Foresight RFP | 🟡 PREP | draft after Move 4 |

**The one remaining blocker:** the real family session with signed consent —
the security incident is closed (token rotated 2026-09-23) and the 501(c)(3)
eligibility gate is resolved, so the only thing standing between the Loom and a
launch-ready Humanity AI application is the family-session evidence.