# P31 — Next Strategic Moves (deep research, 2026-09-23)

**Status:** strategic synthesis from deep web research + verified repo state.
Every external claim is dated and cited; ⚠️ items require human confirmation
before use. The triple-polish UI/UX build is **done** (91 design-core tests
pass); this plan sequences what comes next.

---

## The strategic read (what changed this week)

The agent-governance category is consolidating fast. Verified 2026 facts:

- **IETF Agent Audit Trail advanced to revision -04 (2026-09-15).** New in -04:
  explicit **post-quantum ML-DSA-65 (FIPS 204)** signatures, **attestation
  closure** (decision-reproducibility digests over model weights, tokenizer,
  chat template, inference-engine build, decoding config, numeric environment),
  **Merkle batch anchoring**, and explicit **EU AI Act** mapping. Revision -01
  added **pre-execution recording** (denied/escalated decisions recorded before
  the action runs). — The Loom's PQC capability tokens are already -04-aligned;
  the **event schema does not yet capture attestation closure** (no
  `model_id`/`prompt_template_hash`/`decoding_config` fields). That is the one
  technical gap between P31 and "reference implementation" claim.
- **The market is bigger than earlier research suggested:** agent
  observability & governance $1.68B (2026) → $8.62B (2031), 38.69% CAGR
  (Mordor); agentic-AI governance $15.6B → $173.1B (2034), 35.1% CAGR
  (Research and Markets). Fortune 500 agent deployment: 18% (2024) → 60%
  (Dec 2025) — agents now approve procurement, detect fraud, review code.
- **The family-governance window is opening:** the **CHATBOT Act** (introduced
  2026-04-28, advanced to the Senate floor 2026-08-05) would require AI
  companies to build "family accounts" with verifiable parental consent for
  minors. TrendLife launched **Kaleida** (family AI with per-member guardrails);
  **OpenAI** added a dedicated family product manager (Jul 2026). None of them
  have a hash-chained, PQC-identified, co-presence audit trail — the Loom's
  exact stack. **Regulatory tailwind, not just a market gap.**
- **PQC execution gap is structural:** 87% of orgs plan PQC, only 7% deployed
  (DigiCert, Jul 2026); 54% of top-1M sites support PQC key exchange (F5, Sep
  2026). The Loom's live ML-DSA-65 is demonstrably in the 7%.
- **✅ 501(c)(3) status confirmed 2026-09-23 (IRS determination letter
  received, EIN 42-1888158).** This clears the eligibility gate for Humanity
  AI — P31 Labs can apply as the **lead US 501(c)(3)** (no fiscal-sponsor
  path needed). Prior to confirmation the repo marked the determination
  "pending"; that is now resolved. Still ⚠️ record the exact determination
  date in `grant-pipeline-v2.json` for the application if requested.
- **Capital is flooding the category:** Sycamore $65M (seed, Mar 2026),
  JetStream $34M, Guild.ai $44M, Runta $20M (a16z), Aigentsphere $4M, t54 $5M,
  Nava $8.3M. **The governance layer is funded — the Loom is a family-scoped,
  self-hosted, PQC-signed reference implementation of exactly what they're all
  building, with a live chain to prove it.**
- **Cloudflare Agent Cloud launched (Apr 2026)** — Dynamic Workers (isolate
  runtime for AI-generated code), AI Gateway + Workers AI unified control
  plane, OpenAI-model support. The Loom runs on Workers/Durable Objects — the
  same infrastructure. Governance primitives are the missing layer for Agent
  Cloud deployments.

## The three tracks (run in parallel)

### Track A — Close the security incident (blocking, human action)

The exposed service token (`lumi-write-2`) is the single highest-priority item.
Its plaintext is in the repo. Every hour it's valid, the production chain is
writable by anyone with the credential.

- [ ] Rotate the token: Cloudflare dashboard → Access → Service Auth → revoke
      `lumi-write-2` → create replacement → update Pages secrets
      `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET`.
- [ ] Scrub plaintext from `downloads/Executing the review s fixes…txt`.
- [ ] Re-verify `GET /api/loom/verify` returns `valid:true` with the new token.
- [ ] **Add a public read-only verify endpoint** (Access policy for anonymous +
      synthetic data, or a dedicated read-only worker). Today `/api/loom/verify`
      is 302 (Access-gated) — grant reviewers and prospects can't verify the
      chain. This is the highest-leverage *technical* fix this week: it makes
      the proof inspectable without weakening the write path.

### Track B — Extend the chain for AAT-04 (technical, non-blocking)

- [ ] Add optional fields to `LoomEvent` in `@p31ca/canon/loom/events`:
      `model_id`, `model_version`, `prompt_template_hash`, `decoding_config`,
      `inference_engine_build`.
- [ ] Populate in the Lumi propose path; include in the chain hash.
- [ ] Add `pre_execution` flag (already architectural — record at gate
      evaluation time, not reconstructed).
- [ ] Update `docs/PROOF-OF-BEHAVIOR.md` + `POSITIONING.md` to claim **AAT -04**
      alignment (not -00/-01).

**Why it matters:** this is the difference between "aligned with the direction"
and "reference implementation of the standard the IETF is converging on." The
Foresight RFP (Oct 31) and the research funders (NLnet) reward the specific
technical claim; Humanity AI rewards the community/governance story and does
not depend on it.

### Track C — Evidence + applications (deadline-driven)

1. **Digital Science Catalyst Grant — deadline Mon 2026-10-05, 5pm BST.**
   Up to £25K equity-free, global, individuals/startups/research teams OK.
   Theme: "Agentic Workflows You Can Trust" — audit, governance, provenance.
   The Loom is a verbatim fit. **Lowest effort, nearest deadline.**
2. **Humanity AI — deadline Wed 2026-10-21, 7:59pm ET.** $75K–$1M, ≤3 yr,
   US nonprofits. Requires **one real family session with signed consent** +
   the live chain. The operator pilot is not family validation.
3. **Foresight RFP — deadline 2026-10-31.** $30K–$100K. Research framing;
   best fit once AAT-04 schema work (Track B) lands.

## The dependency graph

```
rotate token ──► public verify endpoint ──► grant evidence (chain + widget)
     │                                          │
     ├──► family session (signed consent) ──────┤
     │                                          ▼
     └──► AAT-04 schema ──► Foresight framing ──► Digital Science (Oct 5)
                                                     Humanity AI (Oct 21)
```

## This week's six moves (in priority order)

1. **Rotate the token** (10-min dashboard action; unblocks everything). *human*
2. **Apply to Humanity AI as lead 501(c)(3)** — eligibility now **confirmed**
   (IRS determination 2026-09-23). No fiscal-sponsor workaround needed. Draft
   the application (Oct 21 deadline). *human reviews draft*
3. **Build the public read-only verify endpoint** (1 day, $0). *dev — me*
4. **Apply to Digital Science Catalyst** (concise, £25K; deadline Oct 5 — no
   501(c)(3) requirement, global eligibility). *human reviews draft*
5. **Schedule the real family session** with signed consent release. *human*
6. **Extend the AAT-04 schema fields** in canon (2–4h, $0). *dev — me*

## What I can build now (no human dependency)

- [x] Governance components + tokens (done: 91 design-core tests pass)
- [x] AAT-04 event-schema extension in `@p31ca/canon` (attestation fields —
      **done 2026-09-23**, additive to the frozen interface)
- [x] Pre-existing canon typecheck errors fixed (24 → 0; all 20 loom tests
      green)
- [ ] Public read-only `/api/loom/verify` path (Access policy + read-only worker)
- [ ] Chain-verification widget for p31ca.org + phosphorus31.org
- [ ] Digital Science Catalyst draft (for human review)

## Guardrails

- No public release without human approval (packages, source).
- No family session without signed consent; never present the operator pilot
  as family validation.
- No metric in any application without a live URL.
- **No Humanity AI submission without the real family session + signed
  consent.** The 501(c)(3) eligibility gate is resolved (confirmed
  2026-09-23); the remaining evidence gate is the family session.
- Human is final reviewer on everything legal or financial (grants, tokens,
  IP).