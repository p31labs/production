# @p31ca/quantum-core

**Quantum-inspired primitives for the P31 family and game layer.**

> **Not a cryptography package.** This package contains no post-quantum
> cryptographic primitives and no IBM Quantum client. If you are looking for the
> PQC asset, see **§ Where the post-quantum cryptography asset lives** below.
> (A previous README claimed SHA-512 "quantum-safe" hashing and an IBM Quantum
> bridge; neither exists in `src/`. Claims removed 2026-10-11.)

## What this package actually is

Quantum-inspired *mathematics* — probability, measurement, and graph models —
used by the family/game surfaces. Real modules, each with a test or a defined
consumer:

| Module | What it does | Status |
|---|---|---|
| `src/sicPovm.ts` | SIC-POVM measurement math | implemented |
| `src/posner.ts` | Posner-style quantum-cognition model | implemented |
| `src/k4.ts` | `K4Graph` — the tetrahedral mesh graph | implemented |
| `src/morphogeneticField.ts` | field value + Clifford rotation | implemented |
| `src/cosmic.ts` | household neuro-map + tetra constants | implemented |
| `src/d20.ts` | die-roll primitive | implemented |
| `src/bandit.ts` | multi-armed bandit | tested (`bandit.test.ts`) |
| `src/edgeAdaptation.ts` | edge adaptation | tested (`edgeAdaptation.test.ts`) |
| `src/feedbackLoop.ts` | feedback loop | tested (`feedbackLoop.test.ts`) |
| `src/did.ts` | DID helper | implemented |

## Where the post-quantum cryptography asset lives

The **fundable PQC unit** is `@p31ca/sovereign-primitives`, not this package.
Cite these paths as evidence — they are real and tested:

- `packages/sovereign-primitives/src/composite.ts` — **composite Ed25519 +
  ML-DSA-65 (FIPS 204)** signatures. `compositeSign` (`:102`), `compositeVerify`
  (`:115`, fails closed), keygen (`:88`); `MLDSA65_SIG_LEN = 3309` (`:19`).
- `packages/sovereign-primitives/src/postQuantum.ts` — hybrid **ML-KEM-768
  (FIPS 203)** KEM + **ML-DSA-65** sign/verify + **SLH-DSA-128s (FIPS 205)**
  via `@noble/post-quantum`, with AES-256-GCM + HKDF. Readiness probe at
  `assessPQCReadiness()` (`:365`).
- `workers/ledger-bridge/src/sdjwt.ts` — ML-DSA-65 SD-JWT credential issue
  (`:223`, `:262`) and verify (`:422`, `:453`).
- `workers/federation-bridge/src/index.ts` — ML-DSA-65 verification
  (`:328`) and composite Object Integrity Proof verification (`:345`).

**Honesty note on labels.** `postQuantum.ts` types the KEM leg as
`'X25519+ML-KEM-768'`, but WebCrypto provides no X25519, so the classical leg is
actually **P-256 ECDH** (`:216`, `:297`). The post-quantum leg is genuinely
ML-KEM-768. A funder brief should state the classical leg as P-256.

**The MCP wrapper is a demo shim.** `workers/p31-crypto-mcp/src/index.ts`
returns synthetic values and performs no cryptography; it is clearly labelled
`demoShim: true` and must never be cited as a compliance artifact.

## FIPS mapping (get this right)

| Standard | Algorithm |
|---|---|
| FIPS 203 | ML-KEM (Kyber) |
| FIPS 204 | ML-DSA (Dilithium) |
| FIPS 205 | SLH-DSA (SPHINCS+) |
| FIPS 197 | AES-256-GCM |

## Install

```bash
npm install @p31ca/quantum-core
```

## Verify

```bash
cd /home/p31/production
grep -c "ml_dsa65\|ml_kem768" packages/sovereign-primitives/src/postQuantum.ts
grep -n "compositeVerify\|MLDSA65_SIG_LEN" packages/sovereign-primitives/src/composite.ts
```

## License

MIT — see `LICENSE`.
