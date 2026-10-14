#!/usr/bin/env node
/**
 * scripts/legc-smoke.mjs — Leg C: the LOVE-settled PAID path through the
 * mcp-x402-gateway, exactly the leg that legs A/B skipped (the gateway leg
 * of scripts/cbs-settlement-smoke.mjs, extracted so it can run the moment
 * the owner puts LOVE_AUTH_SECRET in the Secrets Store).
 *
 * What it proves (per docs/specs/love-settlement-cbs.md §5 and
 * workers/mcp-x402-gateway/src/index.ts:359-439):
 *   C1  gateway /health serves (index.ts:806).
 *   C2  a PAID tools/call (truth_verify_baseline @ $0.01, index.ts:350)
 *       with a valid HMAC-SHA256 proof (X-Love-Auth-MAC over `love:<ts>`,
 *       per src/love-auth.ts:27-55) settles END-TO-END: the gateway blinds
 *       the settlement message, the ledger signs both CBS challenges, and
 *       the bridge verifies BOTH challenge equations + consumes the
 *       single-use coin via POST /verify-settlement
 *       (bridge/src/cbs-verify.mjs:90-136) before dispatching. A 200
 *       result here IS the settlement evidence — 403/502/401 would mean
 *       the signature did not verify, was replayed, or the HMAC failed.
 *   C3  a bad HMAC is rejected with 401 (negative control).
 *   C4  missing HMAC headers are rejected with 401 (negative control).
 *   C5  a valid HMAC with a stale timestamp (> 60s TTL) is rejected with
 *       401 (proves the replay window is enforced, love-auth.ts:34).
 *
 * Secret handling:
 *   - LOVE_AUTH_SECRET is read from the environment, or piped on stdin
 *     (first line), and is NEVER written to disk, never logged, and never
 *     printed. Only a sha256 fingerprint is reported, so the run can be
 *     attributed to the right secret value without revealing it.
 *   - This script performs NO rotation and NO secret placement. It only
 *     READS the secret and sends requests. Owner-executed against
 *     production once the Secrets Store is populated
 *     (docs/fix-plans/p31ca-secrets-automation-2026-10-14.md).
 *
 * Env:
 *   LOVE_AUTH_SECRET   hex or utf8 shared secret (required; else stdin)
 *   SMOKE_DID          DID with balance in love_accounts (default did:smoke:cbs)
 *   LOVE_GATEWAY_URL   (default https://mcp-x402-gateway.trimtab-signal.workers.dev)
 *   LOVE_LEDGER_URL    (default https://love-ledger.p31ca.org — informational)
 *
 * Run (owner, once the store is populated):
 *   LOVE_AUTH_SECRET=<secret> node scripts/legc-smoke.mjs
 *   node scripts/legc-smoke.mjs < /path/to/vault-file
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const GATEWAY = process.env.LOVE_GATEWAY_URL || 'https://mcp-x402-gateway.trimtab-signal.workers.dev';
const LEDGER = process.env.LOVE_LEDGER_URL || 'https://love-ledger.p31ca.org';
const DID = process.env.SMOKE_DID || 'did:smoke:cbs';
const TOOL = 'truth_verify_baseline'; // $0.01, index.ts:350
const TTL_MS = 60_000; // love-auth.ts:34

// ── Secret: env first, else one line from stdin. Never stored/printed. ──
let secret = process.env.LOVE_AUTH_SECRET || '';
if (!secret && !process.stdin.isTTY) {
  try {
    secret = readFileSync(0, 'utf8').trim().split(/\r?\n/)[0];
  } catch {
    secret = '';
  }
}
if (!secret) {
  console.error(
    'legc-smoke: LOVE_AUTH_SECRET not set (env or stdin) — refusing to run.\n' +
      'The gateway rejects unauthenticated LOVE calls by design, so there is\n' +
      'nothing honest to smoke without the shared secret. Owner: run\n' +
      '  LOVE_AUTH_SECRET=<secret> node scripts/legc-smoke.mjs\n' +
      'once the Secrets Store is populated (see docs/fix-plans/p31ca-secrets-automation-2026-10-14.md).',
  );
  process.exit(2);
}
const SECRET_FP = createHash('sha256').update(secret, 'utf8').digest('hex').slice(0, 16);

// ── Reporting (same style as scripts/cbs-settlement-smoke.mjs) ──────────
let failures = 0;
const check = (label, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`);
  if (!cond) failures++;
};

/** HMAC-SHA256 over `love:<ts>`, hex — mirror of verifyLoveHmac. */
async function loveMac(ts) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return Buffer.from(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`love:${ts}`)),
  ).toString('hex');
}

/** One paid LOVE tools/call against the gateway. */
function paidCall(ts, mac) {
  const body = JSON.stringify({
    jsonrpc: '2.0', id: 88, method: 'tools/call',
    params: { name: TOOL, arguments: {} },
  });
  const headers = {
    'Content-Type': 'application/json',
    'X-Creation-Unit': 'love',
    'X-DID': DID,
  };
  if (mac !== undefined) {
    headers['X-Love-Auth-MAC'] = mac;
    headers['X-Love-Timestamp'] = String(ts);
  }
  return fetch(`${GATEWAY}/mcp`, { method: 'POST', headers, body });
}

console.log(`legc-smoke: gateway=${GATEWAY}`);
console.log(`legc-smoke: ledger=${LEDGER} (informational)`);
console.log(`legc-smoke: did=${DID}  tool=${TOOL} ($0.01)  secret_fp=sha256:${SECRET_FP}… (value never shown)`);

// ── C1: gateway health ──────────────────────────────────────────────────
const health = await fetch(`${GATEWAY}/health`);
const healthBody = await health.json().catch(() => ({}));
check('C1 gateway /health 200', health.status === 200,
  `HTTP ${health.status} service=${healthBody.service ?? '?'}`);

// ── C2: paid LOVE call settles end-to-end ───────────────────────────────
const ts = Date.now();
const mac = await loveMac(ts);
const okRes = await paidCall(ts, mac);
const okBody = await okRes.json().catch(() => ({}));
const settled = okRes.status === 200 && !okBody.error;
check('C2 paid LOVE tools/call settles (gateway→ledger CBS issue→bridge verify+consume)',
  settled, `HTTP ${okRes.status} ${JSON.stringify(okBody).slice(0, 160)}`);
if (settled) {
  console.log('      settlement evidence: 200 result — the bridge verified BOTH CBS challenge');
  console.log('      equations and the ledger consumed the single-use coin (a 403 replay /');
  console.log('      401 HMAC / 502 issuance failure would have returned instead).');
}

// ── C3: bad HMAC rejected ───────────────────────────────────────────────
const badRes = await paidCall(ts, 'deadbeef');
check('C3 bad HMAC rejected → 401', badRes.status === 401, `HTTP ${badRes.status}`);

// ── C4: missing HMAC headers rejected ───────────────────────────────────
const noneRes = await paidCall(undefined, undefined);
check('C4 missing HMAC headers rejected → 401', noneRes.status === 401, `HTTP ${noneRes.status}`);

// ── C5: stale timestamp rejected (60s TTL enforced) ─────────────────────
const staleTs = Date.now() - TTL_MS - 5_000;
const staleMac = await loveMac(staleTs);
const staleRes = await paidCall(staleTs, staleMac);
check('C5 valid MAC, stale timestamp → 401 (TTL enforced)', staleRes.status === 401, `HTTP ${staleRes.status}`);

console.log(failures === 0
  ? '\nLEG C SMOKE: PASS — LOVE-settled paid path through the gateway is live.'
  : `\nLEG C SMOKE: FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);