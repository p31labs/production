/**
 * shell/passport.ts — the local sovereign identity (did:key) + owner bootstrap.
 *
 * The identity adapter previously read a `?role=` query param with `did: null`
 * — every face failed closed, so a human could never open the shell. This
 * module replaces that with a real, persisted Ed25519 did:key:
 *
 *   - First visit (no stored passport) → generate a did:key and bootstrap the
 *     role to `admin` (a fresh instance belongs to its first operator).
 *   - Subsequent visits → load the stored passport (did + role) unchanged.
 *
 * Keys are generated via Web Crypto (no network) and encoded with the multicodec
 * 0xed01 did:key derivation — ported from `packages/spaceship-earth` (proven).
 * Persistence is localStorage so identity hydrates synchronously at boot; the
 * full Cognitive Passport bundle (IndexedDB) is a later migration.
 *
 * Security note: extractable keys, plaintext at rest. Threat model = locked
 * device. For higher assurance, wrap with OS-level encryption before persist.
 */
import type { Role } from './authz';

const STORAGE_KEY = 'p31-shell-passport';

export interface ShellPassport {
  /** W3C did:key method, self-certifying. */
  did: string;
  /** Base64url-encoded 32-byte Ed25519 public key. */
  publicKey: string;
  /** Private key as JWK (extractable — sovereignty needs portability). */
  privateKeyJwk: JsonWebKey;
  /** Shell authorization role (viewer | operator | admin). */
  role: Role;
  created: string;
}

const BS58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const ED25519_PREFIX = new Uint8Array([0xed, 0x01]);

function bs58Encode(bytes: Uint8Array): string {
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let out = '';
  for (const byte of bytes) {
    if (byte !== 0) break;
    out += BS58_ALPHABET[0];
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    out += BS58_ALPHABET[digits[i]];
  }
  return out;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Generate a brand-new Ed25519 identity and derive its did:key. No network. */
async function generateDidKey(): Promise<Pick<ShellPassport, 'did' | 'publicKey' | 'privateKeyJwk'>> {
  const keypair = await crypto.subtle.generateKey(
    { name: 'Ed25519' },
    true,
    ['sign', 'verify'],
  );

  const rawPub = new Uint8Array(await crypto.subtle.exportKey('raw', keypair.publicKey));
  const prefixed = new Uint8Array(ED25519_PREFIX.length + rawPub.length);
  prefixed.set(ED25519_PREFIX, 0);
  prefixed.set(rawPub, ED25519_PREFIX.length);
  const did = `did:key:z${bs58Encode(prefixed)}`;

  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keypair.privateKey);

  return { did, publicKey: bytesToBase64Url(rawPub), privateKeyJwk };
}

/** Load a persisted passport, or null when absent/corrupt. Fail-closed. */
export function loadPassport(): ShellPassport | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as ShellPassport;
    if (typeof p.did !== 'string' || !p.did.startsWith('did:key:')) return null;
    if (p.role !== 'viewer' && p.role !== 'operator' && p.role !== 'admin') return null;
    return p;
  } catch {
    return null;
  }
}

function savePassport(p: ShellPassport): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch { /* storage may be unavailable (private mode) — identity is ephemeral */ }
}

/**
 * Load the stored passport or create one. The owner bootstrap: the FIRST
 * passport on this origin is the owner, granted `admin` — the instance's
 * operator by right of first arrival. A stored passport returns unchanged.
 * Keygen failure resolves with a null-did passport (role stays absent) — the
 * shell fails closed rather than granting a role it cannot prove.
 */
/** Memoize the in-flight create so StrictMode double-mounts don't mint two
 *  keys. Once resolved it is cached for the session (no logout path yet). */
let inflight: Promise<ShellPassport | null> | null = null;

export function getOrCreatePassport(): Promise<ShellPassport | null> {
  if (inflight) return inflight;
  inflight = (async () => {
    const existing = loadPassport();
    if (existing) return existing;
    try {
      const identity = await generateDidKey();
      const passport: ShellPassport = {
        ...identity,
        role: 'admin',
        created: new Date().toISOString(),
      };
      savePassport(passport);
      return passport;
    } catch {
      return null;
    }
  })();
  return inflight;
}