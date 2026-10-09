import { storeRecord, loadRecord } from './memory';
import { getOrCreateDidKey, signWithDid } from './identity';

const KEY_STORE = 'pqc-keys';
const KEY_ID = 'active';
const LEDGER_URL = 'https://ledger-bridge.trimtab-signal.workers.dev';

const PQC_PRIVATE_KEYS = new Map<string, Uint8Array>();

// ML-DSA-65 private keys are stored in this in-memory Map only — never persisted to IndexedDB.
// The noble/post-quantum library uses raw byte arrays (not Web Crypto CryptoKey), so we store
// the secret key bytes here in memory. On session start, keys are migrated from legacy format
// if found. If the Map is empty after migration, the user must re-generate.

interface PqcKeyRecord {
  id: string;
  mldsa65Pub: string;
  did: string;
  registered: boolean;
  createdAt: number;
}

interface LegacyPqcKeyRecord extends PqcKeyRecord {
  mldsa65Priv?: string;
}

async function persistPqcKey(did: string, pubB64: string): Promise<void> {
  await storeRecord<PqcKeyRecord>(KEY_STORE, {
    id: KEY_ID, did, mldsa65Pub: pubB64,
    registered: false, createdAt: Date.now(),
  }).catch(() => {});
}

async function loadPqcKey(): Promise<LegacyPqcKeyRecord | null> {
  return loadRecord<LegacyPqcKeyRecord>(KEY_STORE, KEY_ID);
}

async function migrateLegacyPqcKey(record: LegacyPqcKeyRecord): Promise<boolean> {
  if (!record.mldsa65Priv) return false;
  try {
    const privBytes = Uint8Array.from(atob(record.mldsa65Priv), (c) => c.charCodeAt(0));
    PQC_PRIVATE_KEYS.set(record.did, privBytes);
    await persistPqcKey(record.did, record.mldsa65Pub);
    return true;
  } catch {
    return false;
  }
}

export async function isPqcReady(): Promise<boolean> {
  return !!(await loadPqcKey());
}

export async function getMldsa65PubKeyB64(): Promise<string | null> {
  const key = await loadPqcKey();
  return key?.mldsa65Pub ?? null;
}

export async function generatePqcKeyPair(): Promise<{ did: string; pubB64: string }> {
  const { ml_dsa65 } = await import('@noble/post-quantum/ml-dsa.js');
  const signer = await ml_dsa65;
  const keys = signer.keygen();
  const publicKey = await keys.publicKey;
  const secretKey = await keys.secretKey;
  const pubB64 = btoa(String.fromCharCode(...publicKey));

  const did = await getOrCreateDidKey();

  await persistPqcKey(did, pubB64);

  PQC_PRIVATE_KEYS.set(did, secretKey);

  return { did, pubB64 };
}

export async function getOrCreatePqcKey(): Promise<{ did: string; pubB64: string }> {
  const existing = await loadPqcKey();
  if (existing) {
    if (existing.mldsa65Priv) {
      await migrateLegacyPqcKey(existing);
    }
    return { did: existing.did, pubB64: existing.mldsa65Pub };
  }
  return generatePqcKeyPair();
}

export async function signMldsa65(message: string): Promise<{ sigB64: string; pubB64: string } | null> {
  try {
    const { ml_dsa65 } = await import('@noble/post-quantum/ml-dsa.js');
    const signer = await ml_dsa65;
    const key = await loadPqcKey();
    if (!key) return null;

    let privBytes = PQC_PRIVATE_KEYS.get(key.did);
    if (!privBytes) {
      if (key.mldsa65Priv) {
        const migrated = await migrateLegacyPqcKey(key);
        if (migrated) {
          privBytes = PQC_PRIVATE_KEYS.get(key.did);
        }
      }
    }
    if (!privBytes) return null;

    const pubBytes = Uint8Array.from(atob(key.mldsa65Pub), (c) => c.charCodeAt(0));
    const encoder = new TextEncoder();
    const msg = encoder.encode(message);
    const sig = signer.sign(msg, privBytes);
    const sigB64 = btoa(String.fromCharCode(...sig));

    return { sigB64, pubB64: key.mldsa65Pub };
  } catch {
    return null;
  }
}

export async function verifyMldsa65(message: string, sigB64: string, pubB64: string): Promise<boolean> {
  try {
    const { ml_dsa65 } = await import('@noble/post-quantum/ml-dsa.js');
    const signer = await ml_dsa65;
    const pubBytes = Uint8Array.from(atob(pubB64), (c) => c.charCodeAt(0));
    const sigBytes = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0));
    const encoder = new TextEncoder();
    return signer.verify(sigBytes, encoder.encode(message), pubBytes);
  } catch {
    return false;
  }
}

export async function registerPqcOnChain(): Promise<boolean> {
  try {
    const key = await loadPqcKey();
    if (!key) return false;

    const res = await fetch('https://federation.p31ca.org/identity/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        did: key.did,
        ed25519_pub: null, // registered separately via track-a
        mldsa65_pub: key.mldsa65Pub,
      }),
    });
    if (res.ok) {
      await storeRecord<PqcKeyRecord>(KEY_STORE, { id: key.id, did: key.did, mldsa65Pub: key.mldsa65Pub, registered: true, createdAt: key.createdAt }).catch(() => {});
    }
    return res.ok;
  } catch {
    return false;
  }
}

export async function kemEncapsulateXwing(pubKeyB64: string): Promise<{ ciphertext: string; sharedSecret: string } | null> {
  try {
    const res = await fetch(`${LEDGER_URL}/kem/xwing/encapsulate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ publicKey: pubKeyB64 }),
    });
    if (!res.ok) return null;
    return (await res.json()) as { ciphertext: string; sharedSecret: string };
  } catch {
    return null;
  }
}

export async function issueSdJwt(claims: Record<string, unknown>): Promise<{ sdjwt: string } | null> {
  try {
    const did = await getOrCreateDidKey();
    const res = await fetch(`${LEDGER_URL}/credential/issue`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ did, claims, algorithm: 'Ed25519' }),
    });
    if (!res.ok) return null;
    return (await res.json()) as { sdjwt: string };
  } catch {
    return null;
  }
}

export async function verifySdJwt(sdjwt: string): Promise<{ valid: boolean; disclosed: Record<string, unknown> } | null> {
  try {
    const res = await fetch(`${LEDGER_URL}/credential/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sdjwt }),
    });
    if (!res.ok) return null;
    return (await res.json()) as { valid: boolean; disclosed: Record<string, unknown> };
  } catch {
    return null;
  }
}

// ── SLH-DSA-128s key management ─────────────────────────────────────────

const SLHDSA_KEY_STORE = 'slhdsa-keys';
const SLHDSA_KEY_ID = 'active';
const SLHDSA_PRIVATE_KEYS = new Map<string, Uint8Array>();

interface SlhdsaKeyRecord {
  id: string;
  slhdsa128sPub: string;
  did: string;
  registered: boolean;
  createdAt: number;
}

interface LegacySlhdsaKeyRecord extends SlhdsaKeyRecord {
  slhdsa128sPriv?: string;
}

async function persistSlhdsaKey(did: string, pubB64: string): Promise<void> {
  await storeRecord<SlhdsaKeyRecord>(SLHDSA_KEY_STORE, {
    id: SLHDSA_KEY_ID, did, slhdsa128sPub: pubB64,
    registered: false, createdAt: Date.now(),
  }).catch(() => {});
}

async function loadSlhdsaKey(): Promise<LegacySlhdsaKeyRecord | null> {
  return loadRecord<LegacySlhdsaKeyRecord>(SLHDSA_KEY_STORE, SLHDSA_KEY_ID);
}

async function migrateLegacySlhdsaKey(record: LegacySlhdsaKeyRecord): Promise<boolean> {
  if (!record.slhdsa128sPriv) return false;
  try {
    const privBytes = Uint8Array.from(atob(record.slhdsa128sPriv), (c) => c.charCodeAt(0));
    SLHDSA_PRIVATE_KEYS.set(record.did, privBytes);
    await persistSlhdsaKey(record.did, record.slhdsa128sPub);
    return true;
  } catch {
    return false;
  }
}

export async function isSlhdsaReady(): Promise<boolean> {
  return !!(await loadSlhdsaKey());
}

export async function getSlhdsa128sPubKeyB64(): Promise<string | null> {
  const key = await loadSlhdsaKey();
  return key?.slhdsa128sPub ?? null;
}

export async function generateSlhdsaKeyPair(): Promise<{ did: string; pubB64: string }> {
  const { generateSLHDSA128sKeyPair } = await import('../../../../production/packages/sovereign-primitives/src/postQuantum');
  const kp = await generateSLHDSA128sKeyPair();
  if (!kp) throw new Error('SLH-DSA-128s unavailable');
  const pubB64 = btoa(String.fromCharCode(...kp.publicKey));
  const did = await getOrCreateDidKey();
  await persistSlhdsaKey(did, pubB64);
  SLHDSA_PRIVATE_KEYS.set(did, kp.secretKey);
  return { did, pubB64 };
}

export async function getOrCreateSlhdsaKey(): Promise<{ did: string; pubB64: string }> {
  const existing = await loadSlhdsaKey();
  if (existing) {
    if (existing.slhdsa128sPriv) {
      await migrateLegacySlhdsaKey(existing);
    }
    return { did: existing.did, pubB64: existing.slhdsa128sPub };
  }
  return generateSlhdsaKeyPair();
}

export async function signSlhdsa128s(message: string): Promise<{ sigB64: string; pubB64: string } | null> {
  try {
    const { slhdsa128sSign } = await import('../../../../production/packages/sovereign-primitives/src/postQuantum');
    const key = await loadSlhdsaKey();
    if (!key) return null;

    let privBytes = SLHDSA_PRIVATE_KEYS.get(key.did);
    if (!privBytes) {
      if (key.slhdsa128sPriv) {
        const migrated = await migrateLegacySlhdsaKey(key);
        if (migrated) {
          privBytes = SLHDSA_PRIVATE_KEYS.get(key.did);
        }
      }
    }
    if (!privBytes) return null;

    const encoder = new TextEncoder();
    const msg = encoder.encode(message);
    const sig = await slhdsa128sSign(msg, new Uint8Array(privBytes));
    if (!sig) return null;
    const sigB64 = btoa(String.fromCharCode(...sig));

    return { sigB64, pubB64: key.slhdsa128sPub };
  } catch {
    return null;
  }
}

export async function submitCareProof(users: string[], tasks: string[]): Promise<{ ok: boolean } | null> {
  try {
    const did = await getOrCreateDidKey();
    const proofOfControl = await signWithDid(`proof|${did}`);
    if (!proofOfControl) return null;
    const mldsa65 = await signMldsa65(`proof|${did}`);
    const ed25519Pub = (await import('./identity')).getEd25519PubKeyB64();

    const res = await fetch(`${LEDGER_URL}/care-proof`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        did,
        users,
        tasks: tasks.length ? tasks : ['shell-attestation'],
        signature: proofOfControl,
        ...(mldsa65?.sigB64 ? { mldsa65_sig: mldsa65.sigB64 } : {}),
      }),
    });
    if (!res.ok) return null;
    return await res.json() as { ok: boolean };
  } catch {
    return null;
  }
}
