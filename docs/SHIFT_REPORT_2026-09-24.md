# P31 Labs — Shift Report & Handoff

**Date:** 2026-09-24 (late) · **Operator:** Will Johnson · **Assistants:** this session's agent + parallel workstreams
**Deployment:** `https://e6ff2571.p31ca.pages.dev` (production, branch `main`) · **All 18 public routes: 200**

---

## State of play: what is live and honest

The p31ca.org public surface is **procurement-grade and compliance-ready**. Every page renders the dome/starfield ambient; the compliance floor, trust suite, and enterprise pages are complete; the audit-logging claim is honest and verified.

| Area | Status | Notes |
|---|---|---|
| 18 public routes | ✅ 200 | home · about · team · enterprise · research · faq · ways-to-give · financials · treasury · annual-report · privacy · terms · accessibility · press · security · compliance · blog/mcp-marketplace · donate |
| Compliance floor | ✅ Done | privacy/terms/accessibility/press/security all live, canon-safe |
| Trust suite | ✅ Done | faq (16 Qs + JSON-LD), ways-to-give, financials (honest 990 framing), annual-report (year-one) |
| /compliance | ✅ Done | requirement→impl→verify table; EU AI Act Art. 12 deferral (Dec 2027 / Aug 2028) stated; IETF drafts labeled "individual Internet-Drafts"; SCITT "Designed, not certified" |
| /security | ✅ Done | headers read from `_headers` at build time (single source of truth); vuln disclosure; sub-processors; honest "no SOC 2 / ISO 27001" |
| MCP marketplace | ✅ Live | `mcp.p31ca.org`; blog post live, canon-compliant |
| Verification chain | ✅ Green | canon-language guard + dead-email guard + compliance-drift guard all pass; 83/83 tests |

---

## What shipped this shift (the key decisions)

1. **Canon-language guard** — `verify-content-consistency.mjs` now scans public narrative surfaces for `\b(submarine|naval|Navy|military)\b` (excludes "fleet" — legitimate Worker-fleet term). The MCP marketplace blog post + HN draft were corrected from "Navy engineering technician on submarines" to the canon-safe "DoD civilian engineering technician — work with an uncompromising reliability standard, where a single point of failure is not acceptable." Privacy-lighter: no facility identifier.

2. **AI-provenance answer — decided.** The two-corpus distinction is the position:
   - **Research corpus** (P31 Research Series, Zenodo DOIs, ORCID 0009-0002-2492-9079): **human-authored in the strong sense.** Evidence in the papers themselves (Paper IV corrects Paper I's K₄ claim in print; Paper XII's silicon-level hardware detail; Paper XIV's genealogy; Paper III's lived clinical history). AI assisted drafting/prose.
   - **Code corpus**: human-directed, AI-assisted implementation.
   - Public line: **"an AI as my only tool"** — never "collaborator." Verified live.
   - Documented in `GENAI_POLICY.md`, `LOOM_PROMPT_PROVENANCE_LOG.md` (honest: no prompt logs kept), and the NLnet proposal disclosure.

3. **Article 12 deferral corrected** across all four documents (ENTERPRISE_PACKAGE §5 row + prose, compliance page, mapping data). The Digital Omnibus deferred the high-risk logging obligation to **Dec 2, 2027 (Annex III) / Aug 2, 2028 (Annex I)** — not "in force." The drift check now catches regulatory-date divergence too.

4. **Live endpoint honesty.** `loom.p31ca.org/api/loom-public/verify` is behind Cloudflare Access (302) while the route code intends it public — a config mismatch documented as a dashboard action. The compliance page's verify is a **reproducible command** (`git clone … && pnpm verify` — now real, runs the canon hash-chain gate + tamper check), not a rotating URL.

---

## OPEN — human actions with hard dates

**These cannot be done by an agent. They are the actual work between now and Tuesday.**

1. **NLnet eligibility email — SEND TODAY (before Tuesday).**
   Draft: `docs/grants/payloads/nlnet-ai-eligibility-query.md`
   The answer determines whether the NLnet funding path (general open call, **Nov 3 deadline**) is viable. The AI-provenance disclosure is honest about the two corpora; whether it's *eligible* under the forthcoming tightened GenAI policy is a question only NLnet can answer. Knowing before the post is public evidence beats discovering it in November.

2. **Outside reader on the three MCP bug claims — BEFORE MONDAY.**
   The blog post claims: (a) official MCP Registry is stdio-only, (b) every real MCP client requires the JSON-RPC envelope, (c) Durable Object append failures leave permanent forked chains. **The DO forked-chain claim is the highest risk** — if Cloudflare has a recovery path the post doesn't know about, the top HN comment will correct it and the post's authority collapses. Find one independent MCP/Cloudflare reader.

3. **HN post — Tuesday 2026-09-29, ~8am ET.**
   Title: "Show HN: I built an MCP marketplace from an island in Georgia" (no "governed"). Body: `docs/mcp-marketplace-show-hn.md` (canon-compliant, "AI as my only tool", honest "zero real traffic — every call is mine"). Be in the comments within five minutes. The HN launch is the "authorized observer" that collapses the work's superposition into a recognized state.

---

## Infrastructure notes (for the next operator)

- **Deploys:** `npx wrangler pages deploy dist --project-name p31ca --branch=main --commit-dirty=true`. Production branch is `main` (confirmed). Custom-domain edge propagation can lag a minute or two; `cf-cache-status: DYNAMIC` on the alias is normal, not a cache bug.
- **Stale-dist footgun:** if a build is interrupted, `rm -rf dist node_modules/.vite node_modules/.astro .astro` before rebuilding — a dangling `manifest_*.mjs` reference will fail the deploy.
- **Email canon:** `@p31ca.org` is OUT OF COMMISSION (Google Workspace suspended). Canonical contacts: `willyj1587@gmail.com` (general), `trimtab.signal@proton.me` (security). Registered in `src/data/p31-mesh-constants.json` (`contactEmail`, `securityEmail`). The build fails if any live page references `@p31ca.org`.
- **Canon language:** NEVER use "submarine / naval / Navy / military" in public narrative. The operator is a "DoD civilian engineering technician." "Fleet" (of Workers) is fine. The guard enforces this on `src/content/` + `src/pages/blog/` + the HN draft.
- **Mermaid in .astro:** use `set:html={diagramString}` with frontmatter template literals, never inline `<pre>` with `{` (JSX hazard). Bundled `mermaid` import, not CDN.

---

## Strategic context (the long view)

The infrastructure work converts into three converging forces:
- **EU AI Act Art. 12** (deferred to Dec 2027 / Aug 2028) — the Loom is the audit-logging layer high-risk deployments will need.
- **IETF AAT -04 / GAR -02 / SCITT RFC 9943** — the enterprise package maps field-level alignment; SCITT is "Designed, not certified."
- **Accessibility procurement** (Section 508 / EAA / VPAT) — the compliance floor is done; the VPAT is a documented writing task.

The **runbook** (`docs/STRATEGIC_RUNBOOK_2026_Q4.md`) covers: /compliance (built), NLnet (draft + Nov 3), Ad Grants (admin — Goodstack verification), VPAT (writing task), workspace portal (narrative), and the MCP launch (Tuesday).

**The identity:** the operator's self-framing — "the bus bar, the tie bus, the human circuit breaker, the wye-to-delta shift" — maps directly onto the architecture: the Loom is the bus bar, the pre-execution gate is the neutral connection, the refusal sidecar is the zero-sequence record, the human is the grounded neutral between the machine's ungrounded delta and consequence. Public copy uses the wye-delta vocabulary, canon-safe.

---

*Handoff complete. The code is done. The decisions are the work.*