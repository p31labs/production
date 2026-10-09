import { ensureIdentity, signWithIdentity, loadIdentity, multibaseDecode, type LoveIdentity } from '@p31ca/shared-identity';
import { storeRecord, loadRecord } from './memory';

const LEGACY_SHELL_KEY = 'p31-shell-did';
const KEY_STORE = 'identity-keys';
const DID_ID = 'active';

// ── Storage helpers ────────────────────────────────────────────────────────
// Backward compat: verify legacy shell identity format exists for migration awareness
async function migrateLegacyKey(): Promise<boolean> {
  try {
    const legacy = localStorage.getItem(LEGACY_SHELL_KEY);
    if (legacy && legacy.startsWith('did:key:')) {
      // Legacy shell key — shared-identity handles p31-shell-did as fallback
      return true;
    }
  } catch {}
  return false;
}

export async function getOrCreateDidKey(): Promise<string> {
  const { identity } = await ensureIdentity();
  return identity.did;
}

export async function getDidAlias(): Promise<string | null> {
  const stored = localStorage.getItem('p31:love:did-alias');
  if (stored && stored.startsWith('did:p31:')) return stored;
  return null;
}

export async function signWithDid(message: string): Promise<string | null> {
  try {
    const identity = loadIdentity();
    if (!identity) return null;
    return signWithIdentity(identity, message);
  } catch {
    return null;
  }
}

export async function getEd25519PubKeyB64(): Promise<string | null> {
  const identity = loadIdentity();
  if (!identity) return null;
  return identity.publicKey;
}

export async function verifyWithDid(message: string, sigB64: string, pubKeyB64: string): Promise<boolean> {
  try {
    const identity = loadIdentity();
    if (!identity) return false;
    // pubKeyB64 from shared-identity is the multibase-encoded SPKI
    // Use crypto.subtle to verify directly
    const pubBytes = identity.publicKey.startsWith('z')
      ? multibaseDecode(identity.publicKey)
      : Uint8Array.from(atob(pubKeyB64), (c) => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      'spki', pubBytes.buffer as ArrayBuffer, { name: 'Ed25519' }, false, ['verify'],
    );
    const sigBytes = Uint8Array.from(atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
    return await crypto.subtle.verify('Ed25519', cryptoKey, sigBytes, new TextEncoder().encode(message));
  } catch {
    return false;
  }
}
