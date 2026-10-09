#!/usr/bin/env node
/**
 * SOC 2 evidence collection — assembles a controls-index.json from live
 * invariants and repo evidence, mapped to the SOC 2 Trust Services Criteria
 * (Security category). In-house, no SaaS. Outputs to dist/trust/controls-index.json.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const OUT = join(ROOT, 'dist', 'trust', 'controls-index.json');

const PORTAL = process.env.PORTAL_URL || 'https://p31-monetization.trimtab-signal.workers.dev';

async function fetchJson(url, fallback) {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}

const controls = [];

const OWNER = 'p31-core';

// CC7 — System operations: availability + invariants (live evidence).
const invariants = await fetchJson(`${PORTAL}/api/health/invariants`, { healthy: false, invariants: [] });
controls.push({
  criterion: 'CC7.1 / CC7.2',
  control: 'Runtime invariant checks (hash-chain, allocator, config reachability)',
  evidence: `${PORTAL}/api/health/invariants`,
  evidence_url: `${PORTAL}/api/health/invariants`,
  owner: OWNER,
  collection_cadence: 'weekly',
  status: invariants.healthy ? 'operating' : 'degraded',
  detail: invariants.invariants.map((i) => `${i.name}:${i.status}`).join(', '),
});

// CC6 — Logical access: RBAC + webhook HMAC + secrets.
controls.push({
  criterion: 'CC6.1 / CC6.2',
  control: 'Role-based access control (viewer/operator/admin) + webhook HMAC verification',
  evidence: 'docs/SECURITY.md §2-3',
  evidence_url: 'docs/SECURITY.md',
  owner: OWNER,
  collection_cadence: 'manual',
  status: 'operating',
  detail: 'HS256 role tokens; BTCPay webhook HMAC-SHA256 raw-body; D1 idempotency index',
});

// CC8 — Change management: DORA deploy events + idempotent webhook.
const dora = await fetchJson(`${PORTAL}/api/dora/metrics?service=all&days=7`, { metrics: null });
controls.push({
  criterion: 'CC8.1',
  control: 'CI/CD deploy events + DORA metrics (deploy frequency, CFR)',
  evidence: `${PORTAL}/api/dora/metrics`,
  evidence_url: `${PORTAL}/api/dora/metrics`,
  owner: OWNER,
  collection_cadence: 'weekly',
  status: dora.metrics ? 'operating' : 'initializing',
  detail: dora.metrics ? `deploys=${dora.metrics.deploy_frequency.total}, cfr=${dora.metrics.change_failure_rate}` : 'no deploy events yet',
});

// CC6 — Authentication: sovereign DID identity + SBT registry.
controls.push({
  criterion: 'CC6.1',
  control: 'Sovereign Ed25519 did:key identity + soulbound token registry (anchored)',
  evidence: 'src/lib/identity.ts, workers/p31-sbt',
  evidence_url: `${PORTAL}/api/sbt/list?did=:did`,
  owner: OWNER,
  collection_cadence: 'manual',
  status: 'operating',
  detail: 'In-browser DID:key; per-DID SHA-256 SBT chain',
});

// CC3 — Risk: rotation cadence documented.
controls.push({
  criterion: 'CC3.1',
  control: 'Credential rotation runbook + least-privilege model',
  evidence: 'docs/SECURITY.md §1,§2',
  evidence_url: 'docs/SECURITY.md',
  owner: OWNER,
  collection_cadence: 'manual',
  status: 'operating',
  detail: 'Rotation after every session; BTCPay read/create-only key; CDP seller-only',
});

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ collectedAt: new Date().toISOString(), framework: 'SOC 2 Trust Services Criteria (Security)', controls }, null, 2));
console.log(`controls-index written to ${OUT} (${controls.length} controls)`);