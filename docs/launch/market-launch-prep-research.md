# Market Launch Prep — Deep Web Research (2026-09-22)

> **This is the research base.** The operational launch package (plan,
> positioning, messaging, pricing, funding, timeline, gate) lives in
> `docs/launch/loom/`.

**Status:** Research-backed launch preparation. Every factual claim carries a
source class and date; anything unverified is flagged ⚠️ and requires
re-verification before use in grants, pricing, or public claims. Per the
master-prompt verification protocol: a fabricated citation is worse than none.

---

## 1. Market context & timing (the bar this year)

| Signal | Detail | Source class |
|---|---|---|
| AI governance market, 2026 | $1.1B (2026) → $13.1B (2035), 31.4% CAGR | Global Market Insights, 2026-07-31 |
| AI governance market (alt) | $610.5M (2026) → $8.97B (2033), 46.8% CAGR | GII Research, 2026-04-28 |
| Agent governance market (alt) | $2.55B (2026) → $11.05B (2036), 15.8% CAGR | Sycamore seed coverage, 2026-03 |
| EU AI Act Art. 50 transparency | Already operative (general application **2 Aug 2026**). High-risk Chapter III (incl. Art 12 logging) applies **2 Dec 2027** (Annex III) / **2 Aug 2028** (Annex I) — staged by the Digital Omnibus (Reg (EU) 2026/1744). Land on transparency now; high-risk readiness compounds into 2027–28 | EUR-Lex 2026/1744; rind market-research |
| EU AI Act Art. 12 logging | Applies 2 Dec 2027 (Annex III) / 2 Aug 2028 (Annex I) per Reg (EU) 2026/1744; requires automatic, tamper-resistant event logs over system lifetime | EUR-Lex / EU AI Act texts |
| Agent-in-workplace stat | Only 34% of orgs apply the same security controls to AI agents as to human workers | Okta "AI Agents at Work 2026" (via Yahoo Finance, 2026-09-11) |

**What it means:** the market is real, growing fast, and now compliance-driven.
The Loom is architecturally ready before the standard (EU AI Act Art. 12 logging
already satisfied — see `docs/PRODUCTION-READINESS.md`). Timing favors a
transparency-first launch message.

## 2. Competitive landscape — crowded, consolidating

| Move | Detail | Date |
|---|---|---|
| OpenAI "Presence" | Enterprise agent-deployment + governance controls, sold via consulting arm (boots-on-the-ground pricing), not self-serve | 2026-07-21 (The Register; Yahoo Finance) |
| Four standalone agent-governance products | Four enterprise software vendors shipped governance products Aug 24 – early Sep 2026 | Yahoo Finance, 2026-09-11 |
| Gartner Market Guide for Guardian Agents | Recommends prioritizing GA solutions **independent** of AI agent platforms to avoid vendor lock-in | Gartner, 2026-02-24 |
| Credo AI | "The Trusted Leader in AI Governance" — compliance-first, ready policy packs | rind gtm-strategy research |
| Prompt Security | Per-developer pricing (~$300/developer/yr) — bottom-up adoption | rind gtm-strategy research |
| Lakera | Viral educational tool ("Gandalf" gamified challenge) → brand awareness | rind gtm-strategy research |
| Family-AI field | Ollie (SOC 2, $7.5M seed), Cozi, Ava, Maple, Fambot, SuperNori, Google CC (household coordination), Meta Muse | `docs/PRODUCTION-READINESS.md` + 2026-09 coverage |

**Moat conclusion:** do NOT out-feature OpenAI/Credo. The defensible position is
**co-presence + family-centered governance** — a model the enterprise players
are structurally unable to replicate — plus an **enforcement-first** (not
detection-only) architecture: hash-chained, append-only, writer-per-kind.

## 3. Launch framework — the Silent Mode Rollout (directly applicable)

From BotsCrew's "AI Silent Mode: Building AI Trust Pre-Launch" (2026-08-18):
a three-stage human-in-the-loop deployment model that maps almost exactly to
the Loom's invariant ("Lumi proposes, the human decides — never acts
autonomously").

| Stage | What happens | Loom mapping |
|---|---|---|
| 1. Silent Mode | Agent does the full task, nothing leaves without human approval; human shifts from writing to reviewing | **Current state** — Lumi proposes, the human decides |
| 2. Limited-blast-radius autonomy | Agent acts without a human under narrow conditions | Future scope-expansion path, only after the observation window hits its threshold |
| 3. Full autonomy | Agent acts independently within a scoped use case | **Not applicable** to the co-presence invariant |

**Core insight (Moe Ali / enterprise AI, 2026-04-13):** "Make human-in-the-loop a
product feature. Don't hide it as a limitation. Market it." The governance
invariant is not a compromise — it is the product.

## 4. Positioning recommendations

1. **Lead with the invariant as a feature:** "Lumi proposes, the human decides —
   never acts autonomously." This is the product, not a limitation.
2. **Enforcement-first, not detection-only:** the Loom's hash-chained append-only
   audit trail with enforced writer-per-kind is a defensible architecture
   against the "detection tools" crowd.
3. **Public educational demonstration** (the Lakera-"Gandalf" analog): a public,
   shareable demo of *why co-presence matters for families and neurodivergent
   users* — something that travels.
4. **Offensive framing, not defensive:** position as "we enable outcomes" (AI
   governance that lets families safely use AI), not "compliance cost"
   (LinkedIn / Daniel O., 2025-12-31).
5. **Avoid vendor-lock-in framing** (Gartner): the Loom is platform-independent;
   that is an advantage to lead with.

## 5. Funding landscape (time-sensitive)

| Funder | Amount | Deadline | Fit / note |
|---|---|---|---|
| **Humanity AI Open Call** | $75K–$1M, ≤3 yr | **2026-10-21, ~7:59 PM ET** | Community-led AI governance; leads with "governed"; open-source/open-weight priority. ⚠️ Re-verify deadline + eligibility (lead applicant must be US 501(c)(3)). See `docs/master-prompts/GRANTS-SME.md`. |
| **Hewlett Foundation Emerging Tech & Security** | $100M initiative (2026–2031) | Ongoing | AI safety + innovation; nonprofit eligible. ⚠️ Re-verify current call status + deadline on hewlett.org. |
| **ATS Accelerator 2026** (Access to Success) | Free, non-dilutive | Apps closed **2026-06-28**; program Aug–Nov 2026 | For-profit + nonprofit assistive-tech; 🇨🇦 Toronto-based, virtual. ⚠️ Next cycle for P31. |
| **Remarkable US** (CPARF) | Accelerator | ⚠️ Re-verify | First nonprofit assistive-tech accelerator (equity-centered). |
| **Foresight Institute AI Science & Safety RFP** | $30K–$100K | **2026-10-31** | AI governance/safety research; ⚠️ re-verify. |

**Critical caveat:** the Humanity AI application (Oct 21) is the near-term
opportunity and it needs **family-session evidence**. As of 2026-09-23 the only
session on the Loom is an **operator pilot** — NOT family validation (see
`docs/concierge-session-1.md`). A real family session with signed consent is the
prerequisite for the grant narrative and the 3-minute video.

## 6. Operational readiness checklist (priority order)

1. **Security remediation (blocking)** — rotate the exposed Cloudflare Access
   service token (still active, verified 2026-09-23); scrub the plaintext
   credential from `downloads/Executing the review s fixes…txt`. This precedes
   any public launch activity.
2. **Evidence base (blocking for funding)** — run a real family session with a
   signed consent release; capture the 3-minute video (proposal → pause →
   decision). Observation window stays dormant until real family traffic.
3. **Positioning & narrative** — co-presence as the feature; enforcement-first
   architecture; public educational demo; offensive framing.
4. **Go-to-market channels** — grants are the primary channel for a nonprofit
   (Humanity AI, Hewlett, accessibility accelerators), NOT venture capital.
   Open-source core = a funding advantage (Humanity AI prioritizes
   open-weight/open-source).
5. **Compliance readiness** — EU AI Act Art. 12 (auto-logging) already satisfied;
   prepare a transparency statement mapping the Loom's governance to the
   funder's "community-led" criteria.

## 7. Risks and honest gaps

| Risk | Mitigation |
|---|---|
| "Who uses this?" still = "nobody" outside founding team | Recruit a real family member for the next session |
| Competition from OpenAI Presence + funded governance startups | Differentiate on co-presence, family focus, enforcement-first — do not compete on breadth |
| Humanity AI deadline 2026-10-21 | Family session + video must happen before then |
| Exposed service token still active | Rotate before any public launch |
| Consent release unsigned | Signed release is prerequisite for video, which is prerequisite for grant narrative |
| Independent governance is the risk (Thoughtworks 2026-05-12): vendors selling both the model and the governance | Loom is platform-independent — lead with independence |

## 8. Sources (deep web research pass, 2026-09-22)

- BotsCrew — "AI Silent Mode: Building AI Trust Pre-Launch" (2026-08-18)
- The Register — "OpenAI tries the consulting path with 'Presence'" (2026-07-21)
- Yahoo Finance — "Four products, two weeks, one pattern" (2026-09-11); OpenAI
  Presence analysis (2026-08-01)
- Gartner — "Market Guide for Guardian Agents" (2026-02-24)
- Global Market Insights / GII Research — AI governance market forecasts (2026)
- Humanity AI — Open Call press release + $18M pooled grants (2026-05/09)
- Hewlett Foundation — $100M Emerging Technology & Security Initiative (2026-07-15)
- OBIO/Access to Success — ATS Accelerator 2026
- CPARF — Remarkable US accelerator
- Thoughtworks — "AI vendors trying to bridge the governance gap" (2026-05-12)
- Moe Ali (LinkedIn) — "The #1 reason AI projects die" / HITL as a feature (2026-04-13)
- Daniel O. (LinkedIn) — "AI Governance: Compliance vs Infrastructure Positioning"
- rind/humbltech — GTM strategy + market research (2026-03-31)
- Futurum Group / Victorino Group — OpenAI Presence governance analysis (2026-07)
- Foresight Institute — AI for Science & Safety RFP (2026-08-31)

⚠️ **Verification reminders:** re-check all grant deadlines on the fund's sites
before submission; the EU AI Act high-risk dates are **2 Dec 2027 (Annex III) /
2 Aug 2028 (Annex I)** after the Digital Omnibus (Reg (EU) 2026/1744, in force
27 Jul 2026) — the operative near-term obligation is **Art 50 transparency /
general application, 2 Aug 2026**; market
sizing figures vary by analyst and should be cited with their source, not as a
single number.