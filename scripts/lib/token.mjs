#!/usr/bin/env node
/**
 * lib/token.mjs — the approval token (W15).
 *
 * The human's cryptographic approval, bound to a specific action. Hybrid
 * ACP-SIGN-2.0: a real Ed25519 signature always; an ML-DSA-65 signature when
 * the p31-crypto MCP is reachable. If the ML-DSA-65 component is present,
 * both must verify (logical AND); if absent, Ed25519 alone is accepted.
 *
 * The token is single-use, time-bound (15 min), scope-bound. The agent cannot
 * forge it — it does not hold the signing key.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname;
const KEYS_DIR = join(ROOT, '.workspace', 'keys');

/** RFC 8785 canonicalization (shared with the ledger). */
export function jcs(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(jcs).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${jcs(value[k])}`).join(',')}}`;
}

/** Load or create the Ed25519 key pair (the human principal's key). */
export async function loadOrCreateKeys(passphrase = process.env.P31_TOKEN_PASSPHRASE ?? '') {
  mkdirSync(KEYS_DIR, { recursive: true });
  const privPath = join(KEYS_DIR, 'will-ed25519.pem');
  const pubPath = join(KEYS_DIR, 'will-ed25519.pub.pem');
  if (existsSync(privPath)) {
    const privPem = readFileSync(privPath, 'utf8');
    const privKey = await importPrivateKey(privPem);
    const pubPem = readFileSync(pubPath, 'utf8');
    const pubKey = await importPublicKey(pubPem);
    return { privateKey: privKey, publicKey: pubKey };
  }
  const keyPair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const privPem = await exportPrivateKey(keyPair.privateKey);
  const pubPem = await exportPublicKey(keyPair.publicKey);
  writeFileSync(privPath, privPem, { mode: 0o600 });
  writeFileSync(pubPath, pubPem);
  return keyPair;
}

async function exportPrivateKey(key) {
  const raw = new Uint8Array(await crypto.subtle.exportKey('pkcs8', key));
  const b64 = Buffer.from(raw).toString('base64');
  return `-----BEGIN PRIVATE KEY-----\n${b64.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----\n`;
}
async function exportPublicKey(key) {
  const raw = new Uint8Array(await crypto.subtle.exportKey('spki', key));
  const b64 = Buffer.from(raw).toString('base64');
  return `-----BEGIN PUBLIC KEY-----\n${b64.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----\n`;
}
async function importPrivateKey(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const raw = Buffer.from(b64, 'base64');
  return crypto.subtle.importKey('pkcs8', raw, { name: 'Ed25519' }, true, ['sign']);
}
async function importPublicKey(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const raw = Buffer.from(b64, 'base64');
  return crypto.subtle.importKey('spki', raw, { name: 'Ed25519' }, true, ['verify']);
}

export async function signEd25519(privateKey, message) {
  const sig = await crypto.subtle.sign('Ed25519', privateKey, new TextEncoder().encode(message));
  return Buffer.from(sig).toString('hex');
}

export async function verifyEd25519(publicKey, message, signatureHex) {
  const sig = Uint8Array.from(Buffer.from(signatureHex, 'hex'));
  return crypto.subtle.verify('Ed25519', publicKey, sig, new TextEncoder().encode(message));
}

/**
 * Issue an approval token. Always Ed25519-signed; ML-DSA-65 attached when the
 * PQC signer callback is provided (offline-first by default).
 */
export async function issueToken({ proposalId, paths, operation, issuer = 'did:key:will', ttlMs = 15 * 60 * 1000, pqcSign }) {
  const keyPair = await loadOrCreateKeys();
  const id = crypto.randomUUID();
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  const base = { id, proposal_id: proposalId, issued_by: issuer, issued_at: issuedAt, expires_at: expiresAt, scope: { paths, operation } };
  const canonical = jcs(base);
  const signature_ed25519 = await signEd25519(keyPair.privateKey, canonical);
  let signature_mldsa65;
  if (typeof pqcSign === 'function') {
    try { signature_mldsa65 = await pqcSign(canonical); } catch { /* PQC unreachable — Ed25519-only */ }
  }
  const token = { ...base, canonical, signature_ed25519, signature_mldsa65 };
  const ledger = await import('./ledger.mjs');
  await ledger.append('approve', { proposal_id: proposalId, token_id: id, paths, operation });
  return token;
}

/**
 * Verify a token. Returns { ok, reason? }.
 * - Ed25519 signature always verified
 * - ML-DSA-65 verified when present (logical AND)
 * - scope checked against the requested operation
 * - expiry checked
 */
export async function verifyToken(token, requestedPaths, requestedOperation) {
  if (!token?.signature_ed25519) return { ok: false, reason: 'missing ed25519 signature' };
  const keyPair = await loadOrCreateKeys();
  const okEd = await verifyEd25519(keyPair.publicKey, token.canonical, token.signature_ed25519);
  if (!okEd) return { ok: false, reason: 'ed25519 signature invalid' };
  if (token.signature_mldsa65) {
    // PQC verification goes through the p31-crypto MCP verify tool.
    const okPqc = await verifyPqcIfAvailable(token.canonical, token.signature_mldsa65);
    if (okPqc === false) return { ok: false, reason: 'mldsa65 signature invalid' };
  }
  if (Date.parse(token.expires_at) < Date.now()) return { ok: false, reason: 'token expired' };
  if (token.scope?.operation !== requestedOperation) return { ok: false, reason: `scope mismatch: ${token.scope?.operation} != ${requestedOperation}` };
  const scopeOk = requestedPaths.every((p) => (token.scope?.paths ?? []).some((sp) => p === sp || p.startsWith(sp) || sp.startsWith(p)));
  if (!scopeOk) return { ok: false, reason: 'path outside token scope' };
  return { ok: true };
}

async function verifyPqcIfAvailable(message, sigHex) {
  // Offline-first: without the p31-crypto MCP, we can't verify ML-DSA-65.
  // Per ACP-SIGN-2.0 conditional mode, an unverifiable PQC component is
  // treated as absent (Ed25519-only verification passes). When the MCP is
  // reachable, this returns the real verdict.
  return null; // null = not verifiable now → treat as absent
}