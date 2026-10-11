<!-- P31-HEADER
id: p31_grant_case_study_20261011_v1.0
type: research
component: workspace
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

# Case Study — P31 Labs, the pickled street

**Verified:** 2026-10-11 · **Operator:** William R. Johnson · willyj1587@gmail.com

> **The thesis in one image:** *the street never shows a human name — pickle
> labels only.* A household's apps, care records, credentials, and payments are
> all addressable by **pickle codenames**, never by a real identity. That single
> design rule is what makes the whole stack fundable: privacy is not a setting,
> it is the address space.

---

## 1. The Pickle codenames (the privacy spine)

Every person is represented by a **deterministic pickle name** derived from a
seed — *same seed → same name, forever*. The vocabularies are closed and
published (`Dill·quiet`, `Gherkin·warm`, `Corn·drift` …), and generation is
collision-free in batch.

- Named + deterministic: `packages/sovereign-primitives/src/pickle-names/
  index.ts` — `generatePickleName()` (`:79`), `generatePickleNames()` (`:101`),
  invariant checks `pickleInvariants()` (`:121`).
- Canonical family passports: `pickle-names/passports.ts` — **Dillpickle**
  (child), **Bread & Butter** (teen), **Cornichon** (senior), **Gherkin**
  (caregiver), **Half-Sour** (adult); `passportInvariants()` (`:130`) enforces
  unique names and exactly one caregiver.
- Tested: `pickle-names/pickle-names.test.ts` (11 cases) proves determinism,
  vocabulary-closure, and batch collision-freedom.
- **In production use:** the QPJ portal (`portals/qpj/src/lib/pickleNames.ts`,
  `passports.ts`, `identity.ts`) renders every surface — Talk, You, Craft,
  Switch, Workshop — through pickle identities. `VerifiedBadge`, `AvatarMenu`,
  `MeshK4` all speak pickle names.

**Why a funder should care:** most "privacy" is a policy that a vendor can
revoke. A pickle name is math — there is no human name to leak, subpoena, or
sell. It is the same primitive that, at the cryptographic layer, signs
selective-disclosure credentials so a family can prove eligibility without
proving identity.

## 2. The proof (metrics with evidence, not adjectives)

| Claim | Evidence |
|---|---|
| **32 installable design components**, 12 autonomous / 20 supervised | `packages/design-core/registry.json` → `counts: {components:32, chrome:18, installable:32, confidence:{autonomous:12, supervised:20}}` |
| **32 feature surfaces** built on the canon | `apps/phos/src/surfaces/*.tsx` (32 files) |
| **Real, tested post-quantum primitives** | `sovereign-primitives/src/composite.ts` (`:88/:102/:115`), `postQuantum.ts` (`:190/:291`); sizes asserted in `capabilityToken.test.ts` |
| **Hash-chained ledger** | signed state pushes + `verify-chain.mjs` gate |
| **Spoon/crisis model** | capacity-aware UI; low-spoon → less UI, crisis → halt. `spoons`/`crisis` enforced in surfaces + gates |
| **The gate can fail** | `pnpm gate` runs **25 checks** incl. `negative-controls.mjs` and `fix-plan-scan.mjs --self-test`, which plant a violation and assert the gate catches it |

## 3. What it looks like to a funder

A caregiver opens their household app. Everyone is a pickle. The spoon meter
tells the software how much energy there is today — on a zero-spoon day the app
**stops moving** and surfaces only what matters. When the AI proposes a care
action, it must sign for it; there is a legible, hash-chained record of what it
did. Credentials are self-sovereign and post-quantum-ready. Nothing about this
requires a vendor, an account on someone else's cloud, or a real name.

## 4. Honesty (we do not inflate)

- **No catalog-adoption metric yet.** A "23 of 32 components across 8 surfaces"
  figure has circulated in internal briefs but has **no source in the repo** —
  `23` is a *test count* (govern 23/23, 23 SDK tests) and `8 surfaces` is an
  unrelated HUD grid. We cite only the verified registry counts above (32
  components, 32 surfaces, 18 chrome). Catalog adoption is a *to-be-built*
  metric ("Path B" in `docs/enterprise/build-package/runbooks/adoption-and-governance.md`),
  not a completed claim.
- The `p31-crypto-mcp` MCP wrapper is a **labelled demo shim**, not cited as a
  compliance artifact.
- No CMVP FIPS certificate; we use NIST-standardized algorithms (FIPS 203/204/205),
  we do not claim FIPS *validation*.
- The KEM is genuine X-Wing (X25519 + ML-KEM-768); see §5 for the defect that
  was found and fixed (the P-256 leg it replaced).
- Earlier "NGI submitted" claims were reconciled: the Aug-1 TALER/Fediversity
  packages moved to the Nov-3 Restack deadline; carry-over unconfirmed.

## 5. Self-audit — we find and fix our own defects

The strongest evidence of rigor is not a claim of perfection; it is the record
of defects our own gates found, and the fixes. In the week before this LOI:

- **The X-Wing KEM was bespoke, not spec.** `kem.ts` combined shared secrets with
  a non-spec SHA-256 (dropping the transcript binding and label) and cited the
  wrong draft. Replaced with genuine X-Wing — `X25519 + ML-KEM-768`, spec
  `SHA3-256(ss_M ‖ ss_X ‖ ct_X ‖ pk_X ‖ label)` combiner, `draft-connolly-cfrg-
  xwing-kem` — and verified against the **three official KAT vectors**
  (`workers/ledger-bridge/test/vectors/xwing-kat.json`, asserted in
  `kem.test.ts:106-123`). — `docs/fix-plans/pqc-xwing-not-spec-compliant.md`
- **A public endpoint leaked a private key.** `GET /kem/xwing/public` returned
  the KEM secret key over an unauthenticated GET. It now returns the public key
  and size metadata only, with a test asserting `j.secretKey` is undefined. —
  `docs/fix-plans/kem-public-secret-exposure.md`
- **The care-api signature verifier failed OPEN.** `verifyHybridSignature`
  returned `true` unconditionally — a critical authentication bypass. It now
  **fails closed** (401 on the not-yet-implemented ML-DSA-65 path) while the real
  ML-KEM implementation lands. — `docs/fix-plans/care-api-pqc-fail-open.md`
- **Six PQC fix-plans filed** — five resolved (X-Wing combiner, secret-key leak,
  broken hybrid-KEM assertion, false-compliance claim, demo-shim mislabel) and
  one in progress (care-api's ML-KEM stub). The fix-plans are the record; the
  gates are the proof.

This is the "audit approach that ensures AI systems work as intended" — not
written as an aspiration, but run as a gate that planted the violation and
caught it.

## 6. The ask

Fund the transition from **proven primitives** to **audited, adopted care
infrastructure**: wire the real crypto into the services, fund the independent
audit, and publish the pickle-identity + credential toolkit so any care, aid, or
civic service can adopt it freely.

---

`Owner: will` · `Last verified: 2026-10-11`

Verify the numbers: `node -e "console.log(require('./packages/design-core/
registry.json').counts)"` · `ls apps/phos/src/surfaces | wc -l` · `pnpm gate`.
