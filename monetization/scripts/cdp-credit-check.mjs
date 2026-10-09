#!/usr/bin/env node
/**
 * cdp-credit-check — query Coinbase Developer Platform for billing credits /
 * portfolio balances using the project API key on disk or from env.
 *
 * Tries multiple key interpretations (raw base64 vs base64url vs raw bytes)
 * and both EdDSA (Ed25519) and ES256 (secp256k1) JWT signing, then hits the
 * CDP API. Reports which auth worked and any credit/balance data found.
 *
 * Env: CDP_API_KEY_ID, CDP_API_KEY_SECRET (overrides on-disk lookup)
 * Lookup order: env → production/.env → ~/.cdp-keys.json
 *
 * Run: node scripts/cdp-credit-check.mjs
 */
import { createPrivateKey, randomBytes, sign } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ── Resolve credentials ────────────────────────────────────────────────────
function findCreds() {
  const fromEnv = {
    id: process.env.CDP_API_KEY_ID,
    secret: process.env.CDP_API_KEY_SECRET,
  };
  if (fromEnv.id && fromEnv.secret) return fromEnv;

  const wsEnv = '/home/p31/production/.env';
  if (existsSync(wsEnv)) {
    const lines = readFileSync(wsEnv, 'utf8').split('\n');
    const get = (k) => lines.find((l) => l.startsWith(k))?.split('=').slice(1).join('=').trim();
    if (get('CDP_API_KEY_ID') && get('CDP_API_KEY_SECRET')) {
      return { id: get('CDP_API_KEY_ID'), secret: get('CDP_API_KEY_SECRET') };
    }
  }
  const local = join(ROOT, '.cdp-keys.json');
  if (existsSync(local)) {
    try { return JSON.parse(readFileSync(local, 'utf8')); } catch {}
  }
  return null;
}

const creds = findCreds();
if (!creds || !creds.id || !creds.secret) {
  console.log('❌ No CDP credentials found. Set CDP_API_KEY_ID + CDP_API_KEY_SECRET,');
  console.log('   or write .cdp-keys.json { "id": "...", "secret": "..." } (gitignored).');
  console.log('   (The wallet sweep found the id 73250c97-c9f6-476f-875f-35980a9216be —');
  console.log('    if you have its secret, export it.)');
  process.exit(1);
}

const b64u = (buf) => Buffer.from(buf).toString('base64url');
const ED_PKCS8_HEAD = Buffer.from('302e020100300506032b657004220420', 'hex');

// Candidate key materials: base64 decode, base64url decode, raw bytes.
const candidates = [];
const s = creds.secret.trim();
try { candidates.push({ label: 'base64', buf: Buffer.from(s, 'base64') }); } catch {}
try { candidates.push({ label: 'base64url', buf: Buffer.from(s, 'base64url') }); } catch {}
candidates.push({ label: 'raw-ascii', buf: Buffer.from(s, 'utf8') });

async function tryAuth(keyBuf, alg, kid) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg, kid, nonce: randomBytes(12).toString('hex'), typ: 'JWT' };
  const payload = { sub: kid, iss: 'cdp', nbf: now - 60, exp: now + 120 };
  const signingInput = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(payload))}`;

  let sig;
  if (alg === 'EdDSA') {
    if (keyBuf.length !== 32) return { error: `Ed25519 needs 32-byte seed, got ${keyBuf.length}` };
    const der = Buffer.concat([ED_PKCS8_HEAD, keyBuf]);
    let key;
    try { key = createPrivateKey({ key: der, format: 'der', type: 'pkcs8' }); } catch (e) { return { error: `key parse: ${e.message}` }; }
    sig = sign(null, Buffer.from(signingInput), key);
  } else if (alg === 'ES256') {
    if (keyBuf.length !== 32) return { error: `secp256k1 needs 32-byte key, got ${keyBuf.length}` };
    let secp;
    try {
      ({ secp256k1: secp } = await import('@noble/curves/secp256k1.js'));
    } catch {
      try {
        ({ secp256k1: secp } = await import('@noble/curves/secp256k1'));
      } catch (e) { return { error: `@noble/curves unavailable: ${e.message}` }; }
    }
    const msgHash = await crypto.subtle.digest('SHA-256', Buffer.from(signingInput));
    const sig64 = secp.sign(new Uint8Array(msgHash), keyBuf).toCompactHex();
    const rec = secp.sign(new Uint8Array(msgHash), keyBuf).recoverPublicKey().toHex(false);
    // DER encode r,s for ES256 JWT.
    const r = BigInt('0x' + sig64.slice(0, 64)).toString(16).padStart(64, '0');
    const sVal = BigInt('0x' + sig64.slice(64)).toString(16).padStart(64, '0');
    const derSig = Buffer.concat([Buffer.from([0x30, 0x46, 0x02, 0x21]), Buffer.from(r, 'hex'), Buffer.from([0x02, 0x21]), Buffer.from(sVal, 'hex')]);
    sig = derSig;
  }
  if (!sig) return { error: 'no signature produced' };

  const token = `${signingInput}.${b64u(sig)}`;
  try {
    const res = await fetch('https://api.cdp.coinbase.com/platform/v2/portfolios', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    });
    const text = await res.text();
    return { http: res.status, body: text.slice(0, 1500) };
  } catch (e) {
    return { error: `request: ${e.message}` };
  }
}

console.log(`CDP credit check — key id ${creds.id.slice(0, 8)}… secret len ${s.length}`);
let authed = null;
for (const cand of candidates) {
  for (const alg of ['EdDSA', 'ES256']) {
    const r = await tryAuth(cand.buf, alg, creds.id);
    if (r.http === 200) {
      authed = { cand: cand.label, alg, body: r.body };
      break;
    }
    console.log(`  ${cand.label.padEnd(10)} ${alg.padEnd(7)} → ${r.http ?? 'ERR'} ${r.error ?? ''}`);
  }
  if (authed) break;
}

if (authed) {
  console.log(`\n✅ CDP API authenticated (${authed.cand}/${authed.alg})`);
  try {
    const d = JSON.parse(authed.body);
    console.log(JSON.stringify(d, null, 2).slice(0, 2500));
    const totals = d.portfolios ?? d.data ?? [];
    console.log(`\nPortfolios: ${Array.isArray(totals) ? totals.length : 'n/a'}`);
  } catch {
    console.log(authed.body);
  }
} else {
  console.log('\n❌ No auth method worked with the provided secret.');
  console.log('   The reliable check is the portal: portal.cdp.coinbase.com → Billing → Credits.');
  console.log('   If credits exist, send $1 USDC to 0xe60BeF846eCed560aE276822F3FBe40700aCa221, then: pnpm settle');
  process.exit(1);
}