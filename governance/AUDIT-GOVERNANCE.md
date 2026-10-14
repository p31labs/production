# Governance & Provenance Audit — `production/governance`

**Mode:** static + external authority verification · **Date:** 2026-10-02
**Machine-readable findings:** [`.audit/impeccable.json`](./.audit/impeccable.json)

## Verdict in one line

The governance framework is **structurally sound but chronologically backdated**: the bylaws, COI policy, whistleblower policy, and compliance manual are all stamped "March 24, 2026" and "Approved by Board of Directors" — but the corporation was incorporated **April 3** and the board was only constituted **April 11, 2026**. On top of that, the repo contains **two mutually contradictory medical-device classifications** (governance = Class II, admin/WCD = Class I), the compliance report asserts legal/clinical status that postdates it, and the whistleblower policy cites a **nonexistent statute** and points to a **dead email domain**.

**2 critical, 4 high, 5 medium, 4 low.**

## External verification (authoritative sources)

| Claim in docs | Verification |
|---|---|
| 21 CFR § 890.3710, Class II, 510(k) exempt subject to § 890.9 | **VERIFIED** (eCFR, current to 9/30/2026) — governance docs **correct** |
| Product code ILQ = Powered Communication System, Class 2 | **VERIFIED** (FDA classification DB) — governance docs **correct** |
| 11 U.S.C. § 522(d)(9) = health aids exemption | **VERIFIED** (Cornell LII) |
| 21 U.S.C. § 307 (FDA whistleblower) | **NOT FOUND** — section does not exist; real one is § 399d, food-only |
| `p31labs.org` | **DEAD** (000) — the policy's reporting channel doesn't resolve |
| `p31ca.org` | **LIVE** (200) — the working security channel, unused by governance |
| Miller v. Miller / O.C.G.A. § 19-5-13 personal-goodwill-for-IP | **UNVERIFIED** (citation not confirmable) |

## Critical

| ID | Finding |
|---|---|
| **G-P1** | **Governance docs are backdated to a Board that didn't exist.** All five framework docs say "Effective/Approved March 24, 2026"; incorporation was filed April 3 and the first board consent is dated April 11 (Action_of_Incorporator). A board can't approve bylaws 18 days before it exists. |
| **G-P2** | **Classification contradiction.** governance/ = Class II (matches FDA, correct). `admin/P31_COMPLIANCE_AND_REPORTS.md` (the self-declared "FULLY DEPLOYED & MEDICALLY CERTIFIED" compliance record) + WCD clinical docs = **Class I**. Same regulation, two classes, and the compliance record is the wrong one. |

## High

| ID | Finding |
|---|---|
| **G-P3** | Compliance report (Mar 27) claims "501(c)(3) active, EIN published" + "CLINICALLY VALIDATED 350+ trials" — incorporation was April 3, board April 11, and 1023-EZ wasn't filed. Status asserted before it existed. |
| **G-L1** | Whistleblower Policy cites **21 U.S.C. § 307** which does not exist. Real FDA employee protection (§ 399d) is food-specific. Replace with correct authorities. |
| **G-L2** | Policy's reporting channel is `compliance@p31labs.org` — **domain is dead**. No SECURITY.md in governance. Live channel is the security contact in the root SECURITY.md (`trimtab.signal@proton.me`), unreferenced. |
| **G-P4** | `governance/` and `admin/` are **untracked in git** — zero version history, no way to prove which version was in force, no approval trail. |

## Medium

- **G-D1** `governance/README.md` lists CONSTITUTION/ARCHITECTURE/ROADMAP/governance.md — **none exist**. Stale boilerplate.
- **G-D2** "Personal Goodwill / Miller v. Miller" asserted as settled law without a verifiable citation; contracts say IP "cannot be divided in bankruptcy or divorce" — needs Georgia counsel + softened language.
- **G-D3** Manual requires DHF/DMR/RMF/CAPA — **no QMS artifacts exist** despite compliance report claiming 21 CFR Part 820 implemented.
- **G-D4** Four disconnected "governance" surfaces (org legal / packages/govern constitution / community SBT / Lumi agent governance) with no index.
- **G-L3** `governance/CODE_OF_CONDUCT.md` is a truncated generic covenant that **conflicts** with the root CODE_OF_CONDUCT.md (which has P31-specific clauses).

## Low

- **G-D5** Contract templates are 100% placeholder (fine for templates; Summary marks them done — needs a "templates, unexecuted" note).
- **G-P5** Corporate README references `legal-instruments/` (POA, Emergency Resolutions) — **directory doesn't exist**.
- **G-L4** O.C.G.A. § 14-3-821 unanimous-consent cite is plausible but unverified; the instrument's own dates are internally consistent.
- **G-P6** "350+ user trials, 94% overwhelm reduction" clinical claims have no protocol/data on disk.

## Recommended fix order

1. **G-P1** re-date all framework docs to April 11, 2026 (matches board consent) — restore chronology integrity
2. **G-P2** correct Class I → Class II in `admin/P31_COMPLIANCE_AND_REPORTS.md` + WCD docs (this is the record that would face FDA/court)
3. **G-L1/G-L2** fix the nonexistent statute citation and the dead-domain reporting channels; wire governance to the live security contact in root SECURITY.md
4. **G-P4** commit `governance/` + `admin/` and add a document-control register
5. **G-P3/G-P6** strip "active 501(c)(3) / clinically validated" until the determination letter and trial data exist
6. **G-D2/G-D3** counsel review of personal-goodwill strategy; generate or de-claim the QMS artifacts
7. **G-D1/G-D4/G-L3/G-P5** inventory hygiene (README, governance index, single CoC, legal-instruments/)

**Scope note:** This is a document/provenance audit — I verified the regulatory citations against eCFR, the U.S. Code, the FDA product-classification database, and DNS, and cross-checked internal dates against the corporate instruments in `admin/Corporate/`. I am not a lawyer; the legal-strategy findings (G-D2, G-L1, G-L4) require actual Georgia/FDA counsel sign-off, which is explicitly the recommendation. No source files were modified.
---

## Parallel runbook reconciliation — 2026-10-02

The v1.3 convergence runbook packet is now materialized and reconciled in this directory:

- **Layout canonicalized:** `scripts/` (a0-a3, gate, setup, check-baseline), `tests/` (reduced-motion.spec.ts), `templates/` (CHANGELOG.entry.md), `inputs/` (empty gate stubs), `out/`. `runbook.v1.2.yaml` deleted (v1.3 supersedes).
- **a3_verify.sh** — v1.3 semantics restored: governance enforced (FAIL), admin-only date/domain WARN, `command -v dig` SKIP guard, `! rg` zero-match idiom preserved.
- **a1_redate.sh** — changelog gate now accepts `governance/CHANGELOG.md` OR `templates/CHANGELOG.entry.md` with a clear draft-from-template BLOCKED message.
- **setup.sh** — resolves repo root via `git rev-parse --show-toplevel`, idempotent `git worktree add -B`, creates `inputs/` stubs (4 gate files) + symlinks, notes the 3 proof-of-work inputs are not stubbed.
- **reduced-motion.spec.ts** — unit-aware `toMs()` normalization, asserts ≤0.01ms.

**Verified:** `bash -n scripts/*.sh` clean; no governance/*.md or admin/*.md documents were modified (mtimes unchanged).

**Still blocked (human/counsel inputs):** Q1 April 11 wording, Q5 re-date vs re-adopt, Q2 eCFR text, counsel review. New gated drafts added: `templates/QMSR-COMPLIANCE-GAP.md` (ISO 13485:2016 mapping, 21-row section map, G-D3 remediation) and `templates/QMSR-DHFS.md` (DHF/DMR/RMF/CAPA starters) — both "NOT YET APPLIED — counsel review required".
