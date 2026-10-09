/**
 * Sovereign identity for the Capital Machine — Ed25519 did:key.
 * Keypair is generated in-browser (WebCrypto Ed25519) and persisted locally.
 * The DID is the root subject for RBAC role tokens and SBT recognition.
 */

const IDENTITY_KEY = 'p31:monetization:identity';

const B58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58btc(bytes: Uint8Array): string {
  let n = 0n;
  for (const b of bytes) n = (n << 8n) + BigInt(b);
  let out = '';
  while (n > 0n) {
    out = B58_ALPHABET[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b === 0) out = B58_ALPHABET[0] + out;
    else break;
  }
  return out;
}

export interface SovereignIdentity {
  did: string;
  publicKeyHex: string;
  privateKeyHex: string;
  createdAt: number;
}

export function loadIdentity(): SovereignIdentity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SovereignIdentity;
    if (parsed && parsed.did && parsed.did.startsWith('did:key:z')) return parsed;
  } catch {
    // storage unavailable / corrupt
  }
  return null;
}

/** Generate a fresh Ed25519 did:key identity (multibase base58btc, multicodec 0xed 0x01). */
export async function generateIdentity(): Promise<SovereignIdentity> {
  const keyPair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const rawPub = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey));
  const rawPriv = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.privateKey));

  const multicodec = new Uint8Array([0xed, 0x01, ...rawPub]);
  const did = `did:key:z${base58btc(multicodec)}`;

  const identity: SovereignIdentity = {
    did,
    publicKeyHex: hex(rawPub),
    privateKeyHex: hex(rawPriv),
    createdAt: Date.now(),
  };
  persistIdentity(identity);
  return identity;
}

export function persistIdentity(identity: SovereignIdentity): void {
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  } catch {
    // storage unavailable
  }
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Short display form: did:key:z6Mk…abcde */
export function shortDid(did: string): string {
  if (did.length <= 16) return did;
  return `${did.slice(0, 12)}…${did.slice(-5)}`;
}