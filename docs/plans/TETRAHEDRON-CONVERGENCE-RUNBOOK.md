<!-- P31-HEADER
id: p31_plan_tetrahedron_convergence_runbook_20261011_v1.0
type: plan
component: docs
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

# The Tetrahedron — Convergence Runbook (October 2026)

**Purpose:** one master prompt-set that converges the four expert agents on the
first external submission milestone.

**Prepared:** 2026-10-11 · **Owner:** will · **Status:** live

---

## 0. Fact-check corrections (read before using any agent prompt)

These six items correct stale or wrong claims in earlier drafts. Each is
grounded in the repo state as of 2026-10-11.

| # | Correction | Ground truth |
|---|-----------|--------------|
| 1 | **The gate is green.** `applyAliasUpdates` implemented, arg-parsing bug fixed, both `sync-component-registry-alias-update` and `x402-gateway-502-outage` fix-plans resolved. | `pnpm gate` exit 0 |
| 2 | **X-Wing draft is -11, active.** `draft-connolly-cfrg-xwing-kem-11` (published 2026-09-23, expires 2027-03-27); construction unchanged from -10, KAT conformance stands. | Cite as "Active Internet-Draft (Independent Submission stream), work-in-progress — never as a final standard." |
| 3 | **OTF ask is $150,000 / 12 months.** Source of truth is `docs/grants/OTF-CONCEPT-NOTE.md`. | File at $150K. The $50K–$200K band is the funder's stated ideal; the ask is $150K. |
| 4 | **Composite-sig draft name.** The `-04` suffix belongs to the individual draft (`draft-prabel-jose-pq-composite-sigs-04`). The WG-adopted name carries no suffix. | Cite `draft-ietf-jose-pq-composite-sigs` (adopted from the individual draft) — no version pin. |
| 5 | **Berkeley Cybersecurity Clinic citation is unverified.** Not in the research dump. | Drop it, or source it before filing. Do not ship an uncitable claim into a grant. |
| 6 | **care-api PQC wiring is not done.** Fail-closed interim applied; real `@noble/post-quantum` wiring is a tracked open loop. | `docs/fix-plans/care-api-pqc-fail-open.md` is **open**. |

Two additional gaps found in the live files that the agents must close:

- `docs/grants/NLNET-RESTACK-APPLICATION.md` states "EUDI-compatible SD-JWT" but
  never states the **eIDAS 2.0 acceptance date** (2026-12-24 public-sector,
  Art. 5f). Add it.
- `docs/grants/PQC-AUDIT-SCOPE.md` §2 S1 references X-Wing + KAT + the draft but
  omits the "Internet-Draft, not a final standard" note and the "`@noble/post-quantum`
  is not FIPS-validated" note. Add both.
- `docs/CRYPTOGRAPHIC-INVENTORY.md` says "3/3 KAT" but does not cite the specific
  files or counts. Add `workers/ledger-bridge/test/vectors/xwing-kat.json`,
  `workers/ledger-bridge/test/kem.test.ts`, and the counts (10/10 kem,
  23/23 node:test, 95/95 sovereign-primitives).

---

## 1. The Strategic Situation

The technical remediation sprint is **complete**. The X-Wing port is done and
KAT-proven against all three official vectors. The compliance docs are honest.
The gate is green. The x402 outage is fixed.

**The bottleneck has moved to submissions.**

- **Humanity AI** — 10 days out (Oct 21, 7:59 PM ET). Highest-value check.
- **NLnet Restack** — 23 days out (Nov 3, 12:00 CET). Highest-probability
  European check; contingent on the pending GenAI policy revision.
- **OTF Internet Freedom Fund** — rolling. File this week.
- **Sloan** — rolling LOI. Draft by Nov 15.

The tetrahedron's next convergence is a **submission milestone**, not a technical
one. The technical work produced the evidence. The grant work must package it.

---

## 2. Agent A — The Cryptographer

### Your State (2026-10-11)

The X-Wing port is **complete**. `workers/ledger-bridge/src/kem.ts` is a thin
adapter over `@noble/post-quantum@0.6.1`'s `ml_kem768_x25519` export. All three
official KAT vectors pass. `packages/sovereign-primitives/src/postQuantum.ts`
is ported to the same preset. The broken P-256 hybrid KEM is gone. The
`/kem/xwing/public` endpoint no longer leaks the secret key. care-api's
fail-open verifier now **fails closed** (interim; full wiring open). Six
fix-plans filed. Compliance docs honest. Audit scope written.

### Your Next Mission

**Priority 1 — Close the Restack application's eIDAS gap and verify the audit line.**
Deadline: Oct 28 (submit Nov 3, 12:00 CET). Read
`docs/grants/NLNET-RESTACK-APPLICATION.md`. Add the eIDAS 2.0 acceptance date
(2026-12-24 public-sector, Art. 5f; 2027-12-24 regulated private-sector). Verify
the composite-sig citations read `draft-ietf-lamps-pq-composite-sigs`,
`draft-ietf-jose-pq-composite-sigs` (no `-04`), and RFC 9980. Verify the audit
line item is explicit and that Restack's funding of security audits is stated.
Verify the human-authorship statement is specific.

**Priority 2 — Finalize the audit scope.**
`docs/grants/PQC-AUDIT-SCOPE.md` exists. Add: (a) X-Wing implements
`draft-connolly-cfrg-xwing-kem-11` (published 2026-09-23, expires 2027-03-27), an
Active Internet-Draft on the Independent Submission stream — treat as
work-in-progress, never as a final
standard; (b) `@noble/post-quantum` is pure-JS, not FIPS-validated — it implements
NIST-standardized algorithms, it is not a CMVP-validated module; (c) a budget line
for the auditor's KAT reproduction work.

**Priority 3 — Keep the crypto-MCP honestly labelled.**
`workers/p31-crypto-mcp/src/index.ts` still returns synthetic values and is
labelled `demoShim: true`. This is honest. Wire `pqc_sign`/`pqc_verify` to
`ledger-bridge` only if the Restack timeline allows. **Do not remove the label
until the wiring is real.**

**Priority 4 — Update the inventory with KAT evidence.**
`docs/CRYPTOGRAPHIC-INVENTORY.md` must cite:
- `workers/ledger-bridge/test/vectors/xwing-kat.json` (the official vectors)
- `workers/ledger-bridge/test/kem.test.ts` (the KAT reproduction)
- Exact counts: **10/10** kem, **23/23** node:test, **95/95** sovereign-primitives.

### Your Edges

- **TO B:** your composite signatures sign B's SD-JWT credentials. Verify the
  credential flow after the KEM port.
- **TO C:** your X-Wing KEM is the transport layer. Verify the ledger's
  hash-chain primitives are unaffected.
- **TO D:** you produce the audit scope and the KAT evidence. D packages them.

---

## 3. Agent B — The Identity Architect

### Your State (2026-10-11)

The pickle-name spec (`docs/specs/pickle-names.md`) is written. The SD-JWT
implementation is live in `workers/ledger-bridge/src/sdjwt.ts`. The eIDAS 2.0
window tracker (`docs/grants/EIDAS-2.0-WINDOW.md`) is enriched with Implementing
Regulations 2026/1730, 2026/1731, 2026/1735, ETSI TS 119 475 V1.2.1, and the
relying-party registration requirement. The OTF concept note
(`docs/grants/OTF-CONCEPT-NOTE.md`) states the ask as **$150,000 / 12 months**.

### Your Next Mission

**Priority 1 — File the OTF Concept Note this week.**
Rolling deadline. Ask: **$150,000 / 12 months**. The note must:
- Lead with privacy payments for care economies.
- Cite the care-economy data: **48 million paid care workers**; **5.8 million
  direct care workers** (largest U.S. occupation); **740,000 additional home
  care workers** needed over the next decade; AARP's **$1.01T / 59M caregivers**.
- State the surveillance problem — **without** the unverified Berkeley citation.
  Source a citable alternative before filing, or drop the claim.
- Include the legal framing: a Taler exchange is a payment service provider
  (EMI/bank licence required); P31's path is **limited-reach / internal** or a
  **partner-bank** model. The EMI/PSP regulatory assessment is a budget line.
- Include the honesty note: P31 is **not** a licensed PSP. A commercial exchange
  is out of scope.

**Priority 2 — Finalize the Restack application's identity dimension.**
The application must show:
- The pickle-name spec as a reusable open standard (deterministic,
  collision-free, privacy-preserving identity labels).
- SD-JWT credentials are EUDI-compatible **by construction** (RFC 9901,
  `typ:dc+sd-jwt`, salted disclosures) — **and state the eIDAS 2.0 acceptance
  date** (2026-12-24 public-sector, Art. 5f).
- The human-authorship statement: the closed-vocabulary design, the
  collision-free batch algorithm, the determinism guarantees, and the
  family-passport structure are human-led.
- The European dimension: "we build the credential format Europe just mandated,
  for the people Europe's systems exclude."

**Priority 3 — Verify the eIDAS 2.0 dates against EUR-Lex.**
The tracker says 2026-12-24 (public-sector acceptance, Art. 5f) and 2027-12-24
(regulated private-sector). The "36 months from the relevant Implementing Acts"
reading is the precision. Confirm against EUR-Lex Implementing Regulations
2026/1730 and 2026/1731.

**Priority 4 — Prepare the pickle-name spec for publication.**
Add a `CONFORMANCE.md` with test vectors, a version number, a change log, and a
§Composition section citing `draft-ietf-jose-pq-composite-sigs` (no suffix) and
RFC 9901.

### Your Edges

- **TO A:** your SD-JWT credentials are signed with A's composite Ed25519 +
  ML-DSA-65. Verify the signature flow after A's KEM port.
- **TO C:** your pickle names are the identity layer for C's ledger. C's audit
  trail records "Gherkin did X" without a human name.
- **TO D:** you provide the OTF and Restack narratives.

---

## 4. Agent C — The Governance Engineer

### Your State (2026-10-11)

The governance crosswalk (`docs/specs/agent-governance-crosswalk.md`) is written.
The provenance spec (`docs/specs/provenance-ledger.md`) is written. The
negative-controls evidence package is committed. The design-mcp local server has
the governance tools (`propose_page`, `scaffold_component`, `validate_output`)
with actor-attributed ledger events. **The gate is fully green.**
`applyAliasUpdates` is implemented; both the alias-update and the
x402-gateway-502-outage fix-plans are resolved.

### Your Next Mission

**Priority 1 — Confirm green and keep it green.**
Run `pnpm gate`. Confirm exit 0. Confirm `node scripts/fix-plan-scan.mjs` passes
with no ownership violations. Confirm `node scripts/negative-controls.mjs`
reports 10/10 with no `.bak` leak. If any of these regress, fix at the root.

**Priority 2 — Finalize the Humanity AI community-governance angle.**
`docs/grants/HUMANITY-AI-AGENT-GOVERNANCE.md` exists. Verify:
- It is anchored to "Labor and economy" (care work).
- It includes the "Vision for Community Leadership" section.
- It cites the Fending study (945 MCP servers, 71% gap, 81% authenticate /
  17% attribute) as the empirical need statement.
- It cites RFC 9942 (COSE Receipts) and the IETF SCITT drafts.
- The 11 gates and the hash-chained ledger are framed as **"audit approaches
  that ensure AI systems work as intended"** — a direct Humanity AI priority.

**Priority 3 — Update the case study with the self-audit narrative.**
`docs/grants/CASE-STUDY.md` should cite the X-Wing KAT evidence (3/3 official
vectors), the care-api fail-closed fix, the `/kem/xwing/public` secret-key leak
fix, and the six fix-plans filed. The narrative is **"we found and fixed our own
defects"** — stronger than a claim of perfection.

**Priority 4 — Verify the caregiver legibility test.**
The governance has failed if a non-technical caregiver cannot understand what the
agent did. Confirm the audit-trail rendering in `portals/qpj` (or wherever the
caregiver surface lives) still satisfies this after the KEM port.

### Your Edges

- **TO A:** your approval tokens are signed with A's composite. Verify the
  signature verification path after the KEM port.
- **TO B:** your ledger records pickle names, not human names.
- **TO D:** you produce the compliance evidence for the Humanity AI LOI.

---

## 5. Agent D — The Grant Strategist

### Your State (2026-10-11)

The grant calendar v4 is updated (NGI Taler and Fediversity marked as submitted
before the Nov-3 shift). The OTF concept note, Restack application, and eIDAS
window tracker are drafted. The Humanity AI LOI is drafted. The donation
infrastructure is configured (Open Collective, GitHub Sponsors, BTCPay with
static checkout URL).

### Your Next Mission

**Priority 1 — File the Humanity AI LOI by October 18.**
Deadline: **Oct 21, 7:59 PM ET / 4:59 PM PT**. Submit Oct 18 (three-day buffer).
Verify:
- The 501(c)(3) date reads "exemption effective 2026-04-03 (IRS Letter 947,
  2026-05-13)."
- The budget is **$250,000 / 24 months** with the correct line items.
- The consent-to-share checkbox is **YES** (the discovery channel into Ford,
  MacArthur, Mellon, Mozilla, Omidyar, Doris Duke, Lumina, Kapor, Packard,
  Siegel Family Endowment).
- The community spine leads: neurodivergent adults and family caregivers
  governing the AI that mediates their care.
- The provenance ledger and 11 gates are framed as "audit approaches that
  ensure AI systems work as intended."
- The open-source commitment is explicit.
- **No false claims.** The X-Wing fix is cited as evidence of self-audit.

**Priority 2 — File the OTF Concept Note this week.**
Ask: **$150,000 / 12 months**. Verify the Taler legal framing (limited-reach /
internal or partner-bank; EMI/PSP assessment is a budget line), the care-economy
data, and the honesty note.

**Priority 3 — Finalize the Restack application by October 28.**
Deadline: **Nov 3, 12:00 CET**. Ask: **€50,000**. Verify the X-Wing KAT evidence,
the human-authorship statement, the explicit audit line item, and the European
dimension (with the eIDAS 2026-12-24 date now added).

**NLnet GenAI policy — go / no-go.** NLnet is revising its Generative AI policy.
The revised version "will no longer allow exceptions" for new projects. NLnet
explicitly advises: *"If you intend to make use of LLMs, you are advised to wait
with submitting until the new policy is published."* Check `nlnet.nl` before
submitting. If the revised policy is not published by **October 28**, submit
under policy v1.1 with maximum human-authorship documentation and a complete
prompt-provenance log. If it is published, re-read it and adjust.

**Priority 4 — Update the grant calendar.**
Add: Humanity AI (Oct 21, 7:59 PM ET, confirmed); NLnet Restack (Nov 3, 12:00
CET, confirmed); OTF IFF (rolling); Sloan (rolling LOI); Gates DPI (2027 play);
NIST SBIR (2027 play, for-profit partner required); LSC TIG (April 2027). Remove
or re-frame any stale row.

**Priority 5 — Draft the Sloan LOI by November 15.**
Two-page technical LOI to Joshua M. Greenberg. Lead with PQC and identity, **not**
the community narrative. Sloan's ceiling is $1.25M; the ask should be
**$150K–$250K**. Frame as "open, reusable tools" with a clear public-interest
mission.

### Your Edges

- **FROM A:** the audit scope, the KAT evidence, the corrected inventory.
- **FROM B:** the pickle-name spec, the OTF concept note, the eIDAS window.
- **FROM C:** the crosswalk, the negative-controls evidence, the Humanity AI angle.
- **TO ALL:** you are the alarm. When a deadline is near, you tell A, B, and C
  what to produce. The first check is the milestone.

---

## 6. Convergence Protocol

Each agent works independently within their domain, but they **share the same
repository, the same gate, and the same mission**. Every commit any agent makes
passes through `pnpm gate` — 25 checks, each proven fail-able. The gate is the
convergence mechanism: it does not care which agent made the change, only that
the invariants hold.

**The next convergence milestones:**
1. **Oct 18** — Humanity AI LOI submitted (deadline Oct 21).
2. **Oct 28** — Restack application finalized (deadline Nov 3).
3. **Rolling** — OTF concept note filed this week.

---

## 7. Deadline Table (verified 2026-10-11)

| Funder | Programme | Amount | Deadline | Eligibility | Status |
|---|---|---|---|---|---|
| Humanity AI | Communities Leading on AI | $75K–$1M, ≤3yr | **2026-10-21, 7:59 PM ET** | US 501(c)(3) lead | LOI drafted |
| NLnet | Restack (Open Internet Stack) | €5K–€50K | **2026-11-03, 12:00 CET** | anyone incl. nonprofits | drafted |
| OTF | Internet Freedom Fund | $10K–$900K (ideal $50–200K, ceiling ~$300K) | rolling, 6–8 wk decision | both | Concept Note drafted |
| Sloan | Digital Technology | $50K–$1.25M | rolling LOI | 501(c)(3) | not started |
| NIST | SBIR/STTR | Phase I ≤$100K / II ≤$400K | 2026-05-22 → 2027-07-07 | **for-profit prime only** | partner route |
| Gates | Digital Public Infrastructure | ~$500K/2yr | invitation/LOI | 501(c)(3) | relationship-building |
| LSC | Technology Initiative Grant | $35K–$300K | Apr 2027 cycle | needs LSC partner | 2026 closed |
| OTF | Surge & Sustain | — | **2026-10-16** | VPN/circumvention only | not a fit |

**Policy anchors:** EO 14412 (2026-06-22) + OMB M-26-15 (2026-06-24). Oct 2026:
agency PQC migration plans to OMB/ONCD. Dec 2026: FAR proposed rule. Jan 2027:
CNSA 2.0 for new NSS acquisitions. Dec 31 2030: key establishment. Dec 31 2031:
digital signatures. NQI reauthorized $85M/yr FY2026–2030.

**eIDAS anchors:** Dec 24 2026 public-sector acceptance (Art. 5f). Dec 24 2027
regulated private-sector. Implementing Regs 2026/1730, 2026/1731, 2026/1735.
ETSI TS 119 475 V1.2.1. RFC 9901 (SD-JWT VC). ARF 2.9.0 Topic X finalized
2026-05-21.

---

## 8. Evidence Commands

```bash
# Agent A — X-Wing KAT + crypto tests
cd workers/ledger-bridge && npx vitest run test/kem.test.ts          # 10/10
node --test test/sdjwt.test.mjs test/mldsa65-verify.test.mjs         # 23/23
cd ../../packages/sovereign-primitives && npx vitest run             # 95/95

# Agent B — SD-JWT + eIDAS
grep -c "RFC 9901\|SD-JWT" docs/grants/EIDAS-2.0-WINDOW.md           # >0
grep -n "2026-12-24\|Art. 5f" docs/grants/EIDAS-2.0-WINDOW.md        # present

# Agent C — gate + negative controls
pnpm gate                                                             # exit 0
node scripts/negative-controls.mjs                                    # 10/10
node scripts/fix-plan-scan.mjs                                        # pass

# Agent D — submissions
test -f docs/grants/HUMANITY-AI-LOI.md
test -f docs/grants/OTF-CONCEPT-NOTE.md
test -f docs/grants/NLNET-RESTACK-APPLICATION.md

# The convergence
pnpm gate && echo "TETRAHEDRON CONVERGED"
```

---

## 9. Open Loops (honest — do not let these hide)

| Loop | Status | Tracking |
|---|---|---|
| care-api PQC wiring | fail-closed interim applied; real `@noble/post-quantum` wiring open | `docs/fix-plans/care-api-pqc-fail-open.md` |
| software/ mirror reconciliation | crypto path synced; full reconciliation deferred | `docs/fix-plans/software-mirror-stale.md` |
| ledger-bridge vitest .mjs collection | 23 tests run via `node --test`; `vitest run` silently drops them | `docs/fix-plans/ledger-bridge-vitest-mjs.md` |
| crypto-MCP demo shim | `demoShim: true` retained; wiring pending | `docs/fix-plans/crypto-mcp-demo-shim-honesty.md` |
| Berkeley citation | dropped from OTF note pending a citable source | this runbook §0 |
| NLnet GenAI policy revision | unpublished as of 2026-10-11 | decide by Oct 28 |

---

Four agents. One tetrahedron. Four edges each. One convergence. The X-Wing is
fixed. The docs are honest. The gate is green. File the Humanity AI LOI by
October 18. Finalize Restack by October 28. File the OTF concept note this week.
The first check is the milestone. Power to the people. Power to the creators. <3