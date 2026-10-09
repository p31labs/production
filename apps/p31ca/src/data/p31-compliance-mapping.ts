/**
 * p31-compliance-mapping — the single source of truth for the Loom's
 * audit-logging alignment. Imported by both the /compliance page and
 * referenced by ENTERPRISE_PACKAGE.md so the two can never drift.
 *
 * Honest framing:
 *  - EU AI Act Art. 12 applies to HIGH-RISK AI systems (a classification of
 *    the deployer/provider, not P31). The Loom is the logging layer a
 *    high-risk deployment would use.
 *  - IETF drafts (AAT, GAR) are individual Internet-Drafts, not standards.
 *  - SOC 2 / ISO 42001 are not certified.
 */

export interface ComplianceRow {
  id: string
  requirement: string
  scope: string
  implementation: string
  /** The verification method. 'command' = reproducible command; 'attested' = a stated fact (no command exists). */
  kind: 'command' | 'attested'
  verify: string
  /** What a successful verification looks like (for kind === 'command'). */
  expected?: string
}

export const VERIFY_REPRO = 'git clone https://github.com/p31labs/P31-local-workspace && cd apps/loom && pnpm verify'

export const COMPLIANCE_ROWS: ComplianceRow[] = [
  {
    id: 'eu-ai-act-art12',
    requirement: 'EU AI Act Art. 12 — automatic event logging',
    scope: 'Applies to providers/deployers of HIGH-RISK AI systems. P31 is infrastructure, not a high-risk system. Obligation deferred by the Digital Omnibus to Dec 2 2027 (Annex III standalone) / Aug 2 2028 (Annex I embedded).',
    implementation: 'The Loom appends every agent action to a SHA-256 hash chain (RFC 8785 canonicalization), with optional ML-DSA-65 signatures.',
    kind: 'command',
    verify: VERIFY_REPRO,
    expected: 'chain recomputes from genesis; every link holds; `valid: true`',
  },
  {
    id: 'eu-ai-act-retention',
    requirement: 'EU AI Act Art. 12 — six-month minimum retention',
    scope: 'Retention is a configuration parameter of the deployment, not fixed by P31.',
    implementation: 'Chain storage in D1 (primary) + R2 (cold backup). Retention window is configurable.',
    kind: 'attested',
    verify: 'Retention is a deployment configuration; the chain itself records the full history.',
  },
  {
    id: 'ietf-aat',
    requirement: 'IETF AAT — draft-sharif-agent-audit-trail-04',
    scope: 'Individual Internet-Draft (2026-09-15). Not an adopted standard. Expires ~2027-03 without revision.',
    implementation: 'Loom chain format aligns to the AAT JSON record, SHA-256 chaining, and ML-DSA-65 signatures.',
    kind: 'command',
    verify: VERIFY_REPRO,
    expected: 'verify output matches the AAT JSON record shape (agent id, action, outcome, trust level)',
  },
  {
    id: 'ietf-gar',
    requirement: 'IETF GAR — draft-sato-soos-gar-02',
    scope: 'Individual Internet-Draft (2026-06-09). Referenced for Session Audit Record structure.',
    implementation: 'GAR session-audit-record shape referenced in the Loom record.',
    kind: 'attested',
    verify: 'Field mapping documented in ENTERPRISE_PACKAGE.md §5.',
  },
  {
    id: 'rfc9943-scitt',
    requirement: 'RFC 9943 (SCITT architecture)',
    scope: 'Ratified standard, published 2026-06-30. P31 alignment is DESIGNED — the endpoint + Merkle anchor implement the model, not a certified SCITT deployment.',
    implementation: 'Public verify endpoint + Merkle batch anchor follow the SCITT model (Merkle inclusion proofs).',
    kind: 'command',
    verify: VERIFY_REPRO,
    expected: 'Merkle inclusion proof for a record is computable in O(log n)',
  },
  {
    id: 'rfc9881-mldsa',
    requirement: 'RFC 9881 (ML-DSA identifiers)',
    scope: 'Published 2026. Used for ML-DSA-65 signature encoding.',
    implementation: 'Optional ML-DSA-65 signatures on chain records use RFC 9881 identifiers (NIST Level 3).',
    kind: 'attested',
    verify: 'ML-DSA-65 is optional; when present, the record carries the RFC 9881 identifier.',
  },
  {
    id: 'wimse-audit-record',
    requirement: 'IETF WIMSE — draft-gilda-wimse-agent-audit-record-00',
    scope: 'Individual Internet-Draft (2026-09-20). Not an adopted standard.',
    implementation: 'The Loom record uses the WIMSE in-toto predicate inside a DSSE envelope; carries the seven minimum WIMSE audit fields.',
    kind: 'attested',
    verify: 'Envelope shape documented in ENTERPRISE_PACKAGE.md §5.',
  },
  {
    id: 'aic-jwt-capability',
    requirement: 'IETF AIC-JWT — draft-wei-aic-jwt-01',
    scope: 'Individual Internet-Draft (2026-09-08). Referenced in Lumi capability-token design.',
    implementation: 'Lumi capability tokens reference the AIC-JWT direction; the Loom records the proposed action + capability.',
    kind: 'attested',
    verify: 'Capability-token design documented in ENTERPRISE_PACKAGE.md §3 / §5.',
  },
  {
    id: 'dembowski-agentledger',
    requirement: 'IETF — draft-dembowski-agentledger-proof-of-behavior-00',
    scope: 'Individual Internet-Draft (2026-04-20).',
    implementation: 'Aligned on pre-execution enforcement + signed receipt format.',
    kind: 'attested',
    verify: 'Pre-execution gate + refusal sidecar documented in ENTERPRISE_PACKAGE.md §2.',
  },
  {
    id: 'soc2-logging',
    requirement: 'SOC 2 Trust Services Criteria (logging)',
    scope: 'P31 has NOT obtained SOC 2. This maps the logging control to the criteria shape.',
    implementation: 'Tamper-evident append-only log; pre-execution gate records refusals, not just actions.',
    kind: 'attested',
    verify: 'No certification claimed — control mapping, not attestation.',
  },
  {
    id: 'iso42001',
    requirement: 'ISO/IEC 42001 (AI management system)',
    scope: 'P31 has not pursued certification.',
    implementation: 'The audit format maps to the 42001 audit requirements; certification is a later decision.',
    kind: 'attested',
    verify: 'Not certified — stated honestly.',
  },
]

/** The stable custom domain is behind Cloudflare Access (documented §6.2 gap) — not publicly verifiable yet. */
export const LOOM_STABLE_URL = 'https://loom.p31ca.org/api/loom-public/verify'