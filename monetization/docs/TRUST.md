# P31 Capital Machine — Trust Center Runbook

The Trust Center (`#/trust`) is the in-house answer to enterprise security and
compliance questionnaires. It shows what the machine actually does — no
marketing, no invented claims — and points reviewers at live, verifiable
evidence.

## What the surface shows

- **Security posture**: runtime invariants (green/red), DORA metrics (deploy
  frequency, change failure rate), the SBT registry (hash-chained), and the RBAC
  model (viewer / operator / admin).
- **Evidence library**: direct links to `/api/health/invariants`,
  `/api/dora/metrics`, `/api/slo/metrics`, `/api/revenue/verify-chain`,
  `/verify-sbt?hash=`, `dist/trust/controls-index.json`, `docs/SECURITY.md`, and
  `docs/ZERO-TRUST.md`.
- **Pre-answered questionnaire**: ten common enterprise questions (hosting,
  encryption, authentication, authorization, key rotation, incident response,
  supply chain, retention, compliance, contact).

Everything the surface shows either comes from a live endpoint or from a
generated artifact committed under `dist/trust/`.

## How evidence is generated

| Artifact | Source | Cadence |
|---|---|---|
| `dist/trust/controls-index.json` | `node scripts/evidence-collect.mjs` — live invariants + DORA fetches, mapped to SOC 2 TSC controls with owner/cadence/status | weekly (invariants, dora) |
| `dist/trust/sbom.cdx.json` + `.sha256` | `node scripts/sbom.mjs` — CycloneDX 1.5 via cdxgen (minimal fallback if absent) + sha256 digest | per deploy (via `scripts/ci.mjs`) |
| Invariants | `GET /api/health/invariants` | live |
| DORA | `GET /api/dora/metrics?service=all&days=7` | live |
| SLO | `GET /api/slo/metrics` | live |

`scripts/ci.mjs` runs the SBOM step automatically after the gate passes and
before deploy, so every release ships a fresh digest.

## Answering enterprise questionnaires

Point the reviewer at the Trust Center, then:

1. Hosting / encryption: Cloudflare Workers edge, TLS 1.2+ in transit, D1
   encrypted at rest, secrets in-memory only.
2. AuthN: passkeys (WebAuthn to DID), HS256 role tokens, Cloudflare Access JWT.
3. AuthZ: RBAC viewer/operator/admin; admin write routes require an admin token.
4. Keys: rotation runbook in `docs/SECURITY.md` — rotate after every agent
   session that touches secrets; least-privilege scopes only.
5. Incident response: invariants + DORA (CFR, MTTR) + blameless runbooks; the
   hash-chained ledger makes tampering detectable.
6. Supply chain: CycloneDX SBOM + sha256 digest; production signing planned with
   the in-house ML-DSA-65 + Ed25519 hybrid keys (p31-crypto) as trust anchor.
7. Retention: append-only hash-chained ledger, minimal PII.
8. Compliance: SOC 2 Security (TSC) readiness, CPA attestation planned.

## SOC 2 path

The controls index maps evidence to CC3 (risk), CC6 (access + authN), CC7
(system operations), and CC8 (change management). The next milestones are a
CPA-attested audit and wiring the signing worker for SBOM integrity signatures.