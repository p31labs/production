# P31 Labs — Strategic Runbook 2026 Q4

**Status:** infrastructure + compliance floor shipped. This runbook converts what exists into funding, procurement, and revenue.
**Date:** 2026-09-24 · **Source:** deep research across EU AI Act, IETF, NLnet, Sovereign Tech Fund, Google Ad Grants, Section 508/EAA, and the neurodiverse-workforce market.

---

## The convergent forces

Three forces are converging on what P31 already built:

1. **EU AI Act Article 12** — automatic event logging for high-risk AI systems, in force. The Loom is an audit-logging implementation.
2. **IETF AAT -04 / GAR -02** — individual Internet-Drafts (not standards) specifying agent audit records. The enterprise package already maps field-level alignment.
3. **Accessibility procurement** — Section 508 / EAA now require a current VPAT/ACR in regulated-industry SaaS sales. The compliance floor is done; the VPAT formalizes it.

Plus two funding surfaces: **NLnet** (rolling open call, next deadline Nov 3 2026) and **Google Ad Grants** ($10K/mo for 501(c)(3)s).

---

## Move 1 · /compliance page — DONE (this runbook's build)

**What:** `p31ca.org/compliance` — requirement → implementation → verify table.
**Honest framing (critical):**
- EU AI Act Art. 12 applies to **high-risk AI systems** — a classification of the *deployer/provider*, not P31. The page states this explicitly: P31 is infrastructure, not a high-risk system.
- IETF AAT -04 / GAR -02 are **individual Internet-Drafts**, not adopted standards. Alignment stated as-of-date.
- SOC 2 / ISO 42001: **not certified** — control mapping only, stated honestly.
**Verify column** links the live public endpoint — a procurement reviewer confirms the claim in 90 seconds.
**Source of truth:** `ENTERPRISE_PACKAGE.md` §5 (the mapping already lives there; the page renders it, one place to update).
**Status:** built, wired into nav + /security + /enterprise.

**PENDING ACTION (dashboard, before NLnet submission):** the stable `loom.p31ca.org/api/loom-public/verify` returns a 302 (Cloudflare Access challenge), but the route's own code (functions/api/loom-public/verify.ts) is designed to sit OUTSIDE the Access gate — "any visitor, a grant reviewer, a prospective buyer, an auditor can independently verify." This is a config mismatch, not a design gap. Fix: in Cloudflare Access, add a Bypass policy for `/api/loom-public/*` on loom.p31ca.org (or move the verify endpoint to an un-gated hostname). Restores the 90-second verify path the page promises. A 30-minute dashboard action.

---

## Move 2 · NLnet — fresh application for November 3, 2026

**Important:** the November 3 rolling call is the **general open-call pool** — NOT a retarget of the August Fediversity/TALER submissions. Fresh application.

**Framing (honest):** NLnet's general pool funds *privacy, accessibility, localization, internet resilience*. The Loom's strongest fit is **internet resilience + privacy** (auditable agent governance, tamper-evident logging) — not accessibility. Lead with "open-source infrastructure for accountable AI agent deployment."

**Application:**
- Form: `https://nlnet.nl/propose/`
- Amount: €25,000–50,000
- Existing `docs/grants/payloads/P31-STORY-FOR-FUNDERS.md` as the 1-pager
- Write `docs/grants/payloads/LOOM-ACCOUNTABLE-INFRASTRUCTURE.md` — the Loom as accountable-agent-infrastructure, AGPL, open research (22 DOIs), IETF alignment

**Deadline: Nov 3, 2026 (noon CEST).** Six weeks out.

---

## Move 3 · Google Ad Grants — administrative, not technical

**Eligibility (met):** 501(c)(3) determined · 32 pages (min 10) · HTTPS · functional site.

**Three sequential steps:**
1. Enroll in Google for Nonprofits (2–14 business days verification)
2. Activate Ad Grants
3. Complete Advertiser Verification (2026: shifted from TechSoup to **Goodstack**)

**Compliance rules:** every keyword ≥2 words · Quality Score ≥3 · approved domain · 5% CTR minimum.

**Target keywords** (land on /compliance + /enterprise, not homepage):
- "neurodivergent family communication platform"
- "AuDHD family support tools"
- "AI agent audit trail open source"
- "post-quantum identity nonprofit"

**Payoff:** $10,000/month free search ads. Months 1–2 setup; ~cap by months 5–6.

---

## Move 4 · VPAT / Accessibility Conformance Report

**Why:** regulated-industry SaaS procurement now requires "a current VPAT proving WCAG 2.1/2.2 AA and Section 508 conformance, plus ongoing monitoring."

**Honest constraints:**
- The `/accessibility` page already states **partial conformance, self-assessed** — the VPAT formalizes that into per-SC rows (Supports / Partially Supports / Does Not Support / Not Applicable).
- **Budget more than two days.** Every "Partially Supports" needs a specific known limitation + remediation plan.
- If a criterion can't be honestly filled, mark **Not Applicable (with reason)** or **Not Evaluated** — never guess.
- The three known limitations from `/accessibility` (dome under reduced-transparency, spoon system as enhancement, legacy archive pages) become the per-SC rows.

**This is a human/operator action** (a document, not code). The runbook documents the structure; a human author produces the ACR.

---

## Move 5 · Workspace portal — the durable-infrastructure narrative

**State:** `workspace.p31ca.org` live (200).

**Framing:** the Google Workspace suspension that killed `@p31ca.org` is the exact single-point-of-failure the portal eliminates. When the portal is the infrastructure, a `@p31ca.org` address becomes a **routing rule**, not a third-party account that can be revoked. This is the nonprofit "9 disconnected systems → 1 central platform" pattern (the research names Barnardos Australia, Liferay, etc.) — but P31's is sovereign by design.

**No new build required this quarter** — the portal exists. The narrative is the deliverable.

---

## Execution order

1. ✅ **/compliance** (built) — the procurement converter
2. **NLnet** — write `LOOM-ACCOUNTABLE-INFRASTRUCTURE.md`, submit by Nov 3
3. **Ad Grants** — three admin steps (Goodstack verification)
4. **VPAT/ACR** — human-produced document from the /accessibility statement
5. **Workspace narrative** — capture in the grant/funder 1-pager

## What's explicitly not claimed

- **No** "Article 12 compliant" for P31 itself — it's a capability statement for high-risk deployments
- **No** "AAT/GAR standard compliance" — they're individual drafts, alignment as-of-date
- **No** SOC 2 / ISO 27001 / ISO 42001 certification
- **No** third-party WCAG audit — the accessibility claim is self-assessed, labeled as such
- **No** fake VPAT rows — Not Evaluated where not measured

---

## Move 6 · MCP marketplace launch (Show HN — Tuesday Sept 29)

**Artifact:** `p31ca.org/blog/mcp-marketplace` + HN post (`docs/mcp-marketplace-show-hn.md`).
**Framing:** canon-compliant — the background is "DoD civilian engineering technician" (no submarine/naval/Navy/military metaphors; "fleet" is the legitimate Worker-fleet term). The reliability-culture argument is the hook.

**Two dated gates (BOTH by Monday Sept 28, before the post is the public evidence):**

1. **Outside reader on the three bug claims** — an independent MCP + Cloudflare reader must check: the stdio-only registry claim, the JSON-RPC envelope claim, and especially the DO forked-chain claim (highest risk — if wrong, the post dies in HN comments). Deadline: **Mon Sep 28**.
2. **AI-provenance answer — DECIDED (2026-09-24).** The position is `docs/GENAI_POLICY.md`: design is human-directed, implementation is AI-assisted, human owns and is accountable for every line. The public line is "an AI as my only tool" (not "collaborator"). The honest disclosure is `docs/LOOM_PROMPT_PROVENANCE_LOG.md` — which states plainly that P31 did NOT keep contemporaneous prompt logs, rather than presenting a fabricated log.

**PENDING ACTION — ask NLnet directly before Tuesday Sep 29:** email NLnet's funding contact and ask whether this project (AI code assistants used extensively during development; architecture/bug-findings/verification human-directed; substantial code+prose AI-generated under human review; no prompt logs kept) is eligible under the current policy, and what the forthcoming revision requires. Knowing the answer before the post goes live is worth more than discovering it in November. Draft the question in `docs/grants/payloads/nlnet-ai-eligibility-query.md`.

**Post (Tue Sep 29, ~8am ET):** title "Show HN: I built an MCP marketplace from an island in Georgia" (no "governed"). Be in the comments within five minutes. The "zero real traffic, every call is mine" honesty is the right hook.

**Live endpoints:** marketplace `mcp.p31ca.org` · registry `mcp-registry.trimtab-signal.workers.dev`.

---

*This runbook is a reference. Moves 1 is built. Moves 2–5 document human/administrative actions with exact steps and deadlines.*