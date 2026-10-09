/**
 * _lib/credentials.ts — BYOK provider keys at rest.
 *
 * Keys are AES-256-GCM encrypted under the master CREDENTIAL_KEY (a base64
 * secret). The fingerprint (sha256(key).slice(0, 12), hex) identifies a
 * credential without ever revealing it; the key itself is never stored or
 * returned in plaintext except by resolveKey (which fails closed without a
 * configured CREDENTIAL_KEY).
 */
import type { Env } from './ledger';

function b64d(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function masterKey(env: Env): Promise<CryptoKey | null> {
  if (!env.CREDENTIAL_KEY) return null;
  const raw = b64d(env.CREDENTIAL_KEY);
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/** sha256(key).slice(0, 12) as lowercase hex — the public fingerprint. */
export async function sha256Fingerprint(key: string): Promise<string> {
  const bytes = new TextEncoder().encode(key);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 12);
}

/** AES-256-GCM encrypt a plaintext key under the master key. */
export async function encryptKey(env: Env, plaintext: string): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
  const master = await masterKey(env);
  if (!master) throw new Error('CREDENTIAL_KEY not configured');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, master, data);
  return { ciphertext: new Uint8Array(ciphertext), iv };
}

/** Decrypt the latest non-revoked credential for (did, provider). Fails closed. */
export async function resolveKey(env: Env, did: string, provider: string): Promise<{ key: string; fingerprint: string } | null> {
  const master = await masterKey(env);
  if (!master) return null;

  const row = await env.DB.prepare(
    `SELECT ciphertext, iv, fingerprint FROM credentials
     WHERE did = ? AND provider = ? AND revoked_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
  ).bind(did, provider).first<{ ciphertext: ArrayBuffer; iv: ArrayBuffer; fingerprint: string }>();

  if (!row) return null;

  const ciphertext = new Uint8Array(row.ciphertext);
  const iv = new Uint8Array(row.iv);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, master, ciphertext);
  const key = new TextDecoder().decode(plaintext);
  return { key, fingerprint: row.fingerprint };
}