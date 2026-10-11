# PQC Positioning: The Quiet Moat

**P31 Labs — strategic narrative · 2026-10-02**

## 1. The market gap

NIST finalized the three post-quantum cryptography (PQC) standards in August 2024 — ML-KEM (FIPS 203), ML-DSA (FIPS 204), SLH-DSA (FIPS 205). Federal migration deadlines are now locked under CNSA 2.0, and the enforcement clock is shorter than most vendors admit. Google's March 2026 warning is specific: a cryptographically-relevant quantum computer (CRQC) could break RSA-2048 by 2029. That is three years away, and the risk is not symmetric — it is backdated. *Harvest-now-decrypt-later* means anything captured today (health records, care logs, identity data, settlement documents) is being stockpiled for one future run of Shor's algorithm.

The adoption number is the whole story: only ~13% of organizations have started PQC migration. The remaining 87% are exposed, and the 13% who moved are almost all enterprises migrating TLS and certificate authorities. Nobody is migrating the *application layer* where care actually happens — the wallets, the audit logs, the agent trails, the escrowed credentials.

That is the gap P31 occupies.

## 2. What P31 already ships — verified on disk

P31 does not have a PQC *roadmap*. It has a deployed surface. Verified by direct inspection:

**ML-KEM-768 (FIPS 203) — key encapsulation, live.**
- `workers/ledger-bridge/src/kem.ts` implements the X-Wing hybrid KEM (X25519 + ML-KEM-768, `draft-connolly-cfrg-xwing-kem`) via the KAT-validated preset `ml_kem768_x25519` from `@noble/post-quantum/hybrid.js` — X-Wing sizes pk 1216 / ct 1120 / ss 32, verified against all three official KAT vectors.
- `apps/phos/src/workers/love-ledger/taler-cbs/pqc.ts` ships a full `MLKEM`/`MLDSA`/`HybridPQCScheme` class set with the security-level → variant tables.
- `software/packages/quantum-core/test/quantum-core.test.ts` locks FIPS 203 byte sizes in tests.

**ML-DSA-65 (FIPS 204) — signatures, live across the stack.**
- `software/workers/ledger-bridge/src/sdjwt.ts` issues selectively-disclosable SD-JWT (RFC 9901) credentials signed with ML-DSA-65 (`alg: "ML-DSA-65"`, AKP/RFC 9964).
- `software/workers/federation-bridge/src/index.ts` verifies inbound ML-DSA-65 and composite Ed25519+ML-DSA-65 proofs on the mesh.
- `portals/forge/src/lib/pqc-browser.ts` and its tests (`portals/forge/tests/unit/pqc.test.ts`) run ML-DSA-65 in the browser.

**SLH-DSA-128s (FIPS 205) — hash-based backup, live.**
- `packages/sovereign-primitives/src/postQuantum.ts` implements `slh_dsa_sha2_128s` keygen/sign/verify and the triple hybrid (Ed25519 + ML-DSA-65 + SLH-DSA-128s).
- `packages/spaceship-earth/worker/index.ts` exposes a triple-signature verified state-push endpoint for DIDs.

**Tamper-evident audit chain.**
- `apps/loom/docs/AUDIT_STANDARDS.md` documents the append-only event log: `prev_hash` SHA-256 chain (RFC 8785 canonical preimage), `/verify` and `/provenance` endpoints, and a cross-anchor committing the log's head into the LOVE care ledger — "prove what your agent did."

**Governance posture.**
- `governance/MEDICAL_DEVICE_COMPLIANCE_MANUAL.md` §8 codifies FIPS 203/204/205 as the compliance baseline with a phased hybrid migration strategy.

Exposed as tooling: the `p31-crypto-mcp` worker wraps X-Wing KEM, PQC audit, SD-JWT, Taler, and x402 as MCP tools.

## 3. Rival the labs

The frontier labs sell the *model*. P31 sells the *substrate* — the trusted, PQC-ready layer on which models and agents can operate for a family, without a trust-computer in the room. The market that cares most about "your data captured today is being stockpiled" is precisely the market classical vendors ignore: neurodivergent families with sensitive care data, medical-adjacent records, and a right to be left alone. Nobody else is shipping PQC-ready agentic infrastructure to this segment. It is a quiet moat because the buyers do not yet know to ask for it — and the 87% who have not started migration cannot answer when they do.

## 4. Honest limitations

What is NOT done, verified on disk:
- **No external hash anchoring.** The Loom's cross-anchor is computed but the write path is not live (`apps/loom/docs/AUDIT_STANDARDS.md` §5 — "Write path (not yet live)"). Nothing is committed to a public transparency log or witness chain.
- **Stubs remain.** `workers/care-api/src/lib/pqc.ts` still uses an ECDSA P-256 stub with a random-byte ML-KEM placeholder; its verifier previously failed **open** and now fails closed pending real wiring (`docs/fix-plans/care-api-pqc-fail-open.md`). Some MCP KEM handlers return mock output. Real crypto is shipped in ledger-bridge, love-ledger, sovereign-primitives, forge — but not everywhere yet.
- **No full key-management lifecycle.** Rotation/revocation for ML-DSA-65 and SLH-DSA-128s keys across portals is not a managed service; no HSM-backed CA.
- **No certification.** The medical-device manual is policy, not a certificate. No FIPS 140-3 validation, no ACVP testing, no external audit of the PQC surface.

## 5. 90-day action list

1. **Anchor externally.** Wire the Loom's `/verify` head into a public transparency/witness log — closing AUDIT_STANDARDS.md's "Write path (not yet live)" gap.
2. **Kill the stubs.** Replace every ML-KEM placeholder (care-api, glass-box-ws, MCP mock outputs) with real `@noble/post-quantum` — a "no-placeholder" audit across the PQC surface.
3. **Ship the readiness page.** Publish a public PQC posture page: deployed algorithms, key sizes, endpoints, and the §8 migration phases.
4. **Build the key lifecycle.** Managed generation, rotation, guardian-based escrow, and revocation for all PQC keypairs, surfaced in the wallet.
5. **Start certification scoping.** Pick a validated module or partner; adopt NIST ACVP for the noble-based primitives.
6. **Map CNSA 2.0.** One page showing which federal deadlines P31 already satisfies and which remain — ammunition for procurement.
7. **Productize the moat.** Package the crypto MCP + audit chain as a "PQC-ready substrate" evaluation kit for care providers and grant reviewers.