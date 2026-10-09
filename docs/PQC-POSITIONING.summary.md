# PQC Positioning — Executive Summary

NIST finalized FIPS 203/204/205 in August 2024; federal migration deadlines are locked, and Google's March 2026 warning puts a quantum break of RSA-2048 as early as 2029. Only ~13% of organizations have started PQC migration, and harvest-now-decrypt-later means today's care data is being stockpiled for one future run of Shor's algorithm.

P31 Labs already ships the antidote. Verified on disk: ML-KEM-768 key encapsulation (X-Wing hybrid in `software/workers/ledger-bridge/src/kem.ts`), ML-DSA-65 signatures across wallet, SD-JWT credential, and federation services (`software/workers/ledger-bridge/src/sdjwt.ts`), SLH-DSA-128s with a triple-signature scheme (`packages/sovereign-primitives/src/postQuantum.ts`), and a tamper-evident `prev_hash` audit chain with a cross-anchor into the LOVE care ledger (`apps/loom/docs/AUDIT_STANDARDS.md`).

While labs sell the model, P31 sells the trusted, PQC-ready substrate for the neurodivergent-family market — a segment no one else is serving with post-quantum agentic infrastructure. Honest gaps: no external hash anchoring, remaining ML-KEM stubs, no managed key lifecycle, no certification.

90-day focus: anchor the audit chain publicly, replace stubs, ship a PQC posture page, build the key lifecycle, and begin ACVP/FIPS validation scoping. This is a quiet moat — and it is already built.