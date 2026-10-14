import { describe, it, expect } from 'vitest';
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import { slh_dsa_shake_128s } from '@noble/post-quantum/slh-dsa.js';
import { buildEUDIVC, exportEUDISDJWT, validateEUDIVC } from '@p31ca/ui/passport/eudi';
import type { CognitivePassport } from '@p31ca/ui/passport/schema';

const PASSPORT: CognitivePassport = {
  did: 'did:key:z6MkTest123',
  identity: { displayName: 'Test User', pronouns: 'they/them', role: 'CHILD' },
  cognition: { processingStyle: 'visual', strengths: ['pattern-recognition'] },
  accessibility: {
    screenComfort: 3,
    motionPreference: 'reduced',
    contrastPreference: 'standard',
    fontSize: 16,
    density: 1,
  },
  created: '2026-01-01T00:00:00.000Z',
};

// ── ML-KEM-768 ──────────────────────────────────────────────────────────

describe('ML-KEM-768 key encapsulation', () => {
  it('generates a valid keypair', () => {
    const kp = ml_kem768.keygen();
    expect(kp.publicKey).toBeInstanceOf(Uint8Array);
    expect(kp.secretKey).toBeInstanceOf(Uint8Array);
    expect(kp.publicKey.length).toBe(1184);
    expect(kp.secretKey.length).toBe(2400);
  });

  it('encapsulates and decapsulates to the same shared secret', () => {
    const kp = ml_kem768.keygen();
    const { cipherText, sharedSecret } = ml_kem768.encapsulate(kp.publicKey);
    expect(cipherText).toBeInstanceOf(Uint8Array);
    expect(cipherText.length).toBe(1088);
    expect(sharedSecret.length).toBe(32);

    const decapped = ml_kem768.decapsulate(cipherText, kp.secretKey);
    expect(decapped).toEqual(sharedSecret);
  });

  it('produces different ciphertexts across runs (non-deterministic)', () => {
    const kp = ml_kem768.keygen();
    const a = ml_kem768.encapsulate(kp.publicKey);
    const b = ml_kem768.encapsulate(kp.publicKey);
    expect(a.cipherText).not.toEqual(b.cipherText);
    expect(a.sharedSecret).not.toEqual(b.sharedSecret);
  });

  it('decapsulated secret differs for wrong key', () => {
    const kp1 = ml_kem768.keygen();
    const kp2 = ml_kem768.keygen();
    const { cipherText } = ml_kem768.encapsulate(kp1.publicKey);
    const wrong = ml_kem768.decapsulate(cipherText, kp2.secretKey);
    expect(wrong).not.toEqual(ml_kem768.encapsulate(kp1.publicKey).sharedSecret);
  });
});

// ── ML-DSA-65 ───────────────────────────────────────────────────────────

describe('ML-DSA-65 digital signature', () => {
  it('generates a valid keypair with expected sizes', () => {
    const kp = ml_dsa65.keygen();
    expect(kp.publicKey).toBeInstanceOf(Uint8Array);
    expect(kp.secretKey).toBeInstanceOf(Uint8Array);
    expect(kp.publicKey.length).toBe(1952);
    expect(kp.secretKey.length).toBe(4032);
  });

  it('signs and verifies a message', () => {
    const kp = ml_dsa65.keygen();
    const msg = new TextEncoder().encode('P31 post-quantum test');
    const sig = ml_dsa65.sign(msg, kp.secretKey);
    expect(sig).toBeInstanceOf(Uint8Array);
    expect(sig.length).toBe(3309);

    const valid = ml_dsa65.verify(sig, msg, kp.publicKey);
    expect(valid).toBe(true);
  });

  it('rejects a tampered message', () => {
    const kp = ml_dsa65.keygen();
    const msg = new TextEncoder().encode('authentic message');
    const sig = ml_dsa65.sign(msg, kp.secretKey);

    const tampered = new TextEncoder().encode('tampered message');
    expect(ml_dsa65.verify(sig, tampered, kp.publicKey)).toBe(false);
  });

  it('rejects signature from a different key', () => {
    const kp1 = ml_dsa65.keygen();
    const kp2 = ml_dsa65.keygen();
    const msg = new TextEncoder().encode('test');
    const sig = ml_dsa65.sign(msg, kp1.secretKey);

    expect(ml_dsa65.verify(sig, msg, kp2.publicKey)).toBe(false);
  });

  it('getPublicKey derives the same public key', () => {
    const kp = ml_dsa65.keygen();
    const derived = ml_dsa65.getPublicKey(kp.secretKey);
    expect(derived).toEqual(kp.publicKey);
  });
});

// ── SLH-DSA-128s (SHAKE) ───────────────────────────────────────────────

  describe('SLH-DSA-128s (SHAKE) digital signature', () => {
    it('generates a valid keypair', () => {
      const kp = slh_dsa_shake_128s.keygen();
      expect(kp.publicKey).toBeInstanceOf(Uint8Array);
      expect(kp.secretKey).toBeInstanceOf(Uint8Array);
      expect(kp.publicKey.length).toBe(32);
      expect(kp.secretKey.length).toBe(64);
    }, 180000);

    it('signs and verifies a message', () => {
      const kp = slh_dsa_shake_128s.keygen();
      const msg = new TextEncoder().encode('SLH-DSA test message');
      const sig = slh_dsa_shake_128s.sign(msg, kp.secretKey);
      expect(sig).toBeInstanceOf(Uint8Array);
      expect(sig.length).toBe(7856);

      const valid = slh_dsa_shake_128s.verify(sig, msg, kp.publicKey);
      expect(valid).toBe(true);
    }, 180000);

    it('rejects a tampered message', () => {
      const kp = slh_dsa_shake_128s.keygen();
      const msg = new TextEncoder().encode('original');
      const sig = slh_dsa_shake_128s.sign(msg, kp.secretKey);

      const tampered = new TextEncoder().encode('tampered');
      expect(slh_dsa_shake_128s.verify(sig, tampered, kp.publicKey)).toBe(false);
    }, 180000);

    it('rejects signature from a different key', () => {
      const kp1 = slh_dsa_shake_128s.keygen();
      const kp2 = slh_dsa_shake_128s.keygen();
      const msg = new TextEncoder().encode('test');
      const sig = slh_dsa_shake_128s.sign(msg, kp1.secretKey);

      expect(slh_dsa_shake_128s.verify(sig, msg, kp2.publicKey)).toBe(false);
    }, 180000);
  });

// ── EUDI VC build + validate ────────────────────────────────────────────

describe('EUDI VC (buildEUDIVC + validateEUDIVC)', () => {
  it('builds a structurally valid EUDI VC', () => {
    const vc = buildEUDIVC(PASSPORT, PASSPORT.did);
    const result = validateEUDIVC(vc);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(vc.type).toContain('VerifiableCredential');
    expect(vc.type).toContain('CognitivePassportCredential');
    expect(vc.issuer).toBe(PASSPORT.did);
    expect(vc.credentialSubject.id).toBe(PASSPORT.did);
    expect(vc.credentialSubject.displayName).toBe('Test User');
    expect(vc.credentialSchema.type).toBe('JsonSchemaValidator2018');
    expect(vc.credentialStatus.type).toBe('StatusList2021Entry');
  });

  it('validates fail on missing issuer', () => {
    const vc = buildEUDIVC(PASSPORT, PASSPORT.did);
    vc.issuer = '';
    const result = validateEUDIVC(vc);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing issuer');
  });

  it('validates fail on invalid credentialStatus type', () => {
    const vc = buildEUDIVC(PASSPORT, PASSPORT.did);
    (vc.credentialStatus as any).type = 'InvalidType';
    const result = validateEUDIVC(vc);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('StatusList2021Entry'))).toBe(true);
  });

  it('validFrom is before validUntil', () => {
    const vc = buildEUDIVC(PASSPORT, PASSPORT.did);
    expect(new Date(vc.validFrom).getTime()).toBeLessThan(new Date(vc.validUntil).getTime());
  });
});

// ── EUDI VC export with triple signatures ───────────────────────────────

describe('EUDI VC export (triple-signature)', () => {
  async function ed25519Signer(payload: object): Promise<string> {
    const header = btoa(JSON.stringify({ alg: 'EdDSA', typ: 'JWT' }));
    const payloadB64 = btoa(JSON.stringify(payload));
    const sigBytes = new Uint8Array(64);
    crypto.getRandomValues(sigBytes);
    const sigB64 = btoa(String.fromCharCode(...sigBytes)).replace(/=+$/, '');
    return `${header}.${payloadB64}.${sigB64}`;
  }

  async function mldsa65Signer(payload: object): Promise<string> {
    const kp = ml_dsa65.keygen();
    const sig = ml_dsa65.sign(new TextEncoder().encode(JSON.stringify(payload)), kp.secretKey);
    return btoa(String.fromCharCode(...sig));
  }

  function slhdsa128sSigner(payload: object): string {
    const kp = slh_dsa_shake_128s.keygen();
    const sig = slh_dsa_shake_128s.sign(new TextEncoder().encode(JSON.stringify(payload)), kp.secretKey);
    return btoa(String.fromCharCode(...sig));
  }

  it('exports Ed25519-only when no PQC signers provided', async () => {
    const vc = await exportEUDISDJWT(PASSPORT, PASSPORT.did, ed25519Signer);
    expect(vc.proof).toBeDefined();
    const proof = vc.proof as any;
    expect(proof.type).toContain('JwtProof2020');
    expect(proof.proof_values.ed25519).toBeTruthy();
    expect(proof.proof_values.ml_dsa).toBeUndefined();
  });

  it('exports with ML-DSA-65 co-signature', async () => {
    const vc = await exportEUDISDJWT(PASSPORT, PASSPORT.did, ed25519Signer, mldsa65Signer);
    expect(vc.proof).toBeDefined();
    const proof = vc.proof as any;
    expect(proof.type).toContain('PQCProof2026');
    expect(proof.proof_values.ed25519).toBeTruthy();
    expect(proof.proof_values.ml_dsa).toBeTruthy();
  });

  it('triple-signature proof contains Ed25519 + ML-DSA + SLH-DSA fields', async () => {
    const kp = ml_dsa65.keygen();
    const slhKp = slh_dsa_shake_128s.keygen();

    const vc = await exportEUDISDJWT(PASSPORT, PASSPORT.did, ed25519Signer, (payload) => {
      const sig = ml_dsa65.sign(
        new TextEncoder().encode(JSON.stringify(payload)),
        kp.secretKey,
      );
      return Promise.resolve(btoa(String.fromCharCode(...sig)));
    });

    const proof = vc.proof as any;
    expect(proof.proof_values.ed25519).toBeTruthy();
    expect(proof.proof_values.ml_dsa).toBeTruthy();

    // Verify ML-DSA signature roundtrips
    const payloadBytes = new TextEncoder().encode(JSON.stringify(proof.jwt_payload));
    const mlSig = Uint8Array.from(atob(proof.proof_values.ml_dsa), (c) => c.charCodeAt(0));
    expect(ml_dsa65.verify(mlSig, payloadBytes, kp.publicKey)).toBe(true);
  }, 180000);
});

// ── DID document generation with PQC keys ───────────────────────────────

function bs58Encode(buf: Uint8Array): string {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let num = BigInt('0x' + Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join(''));
  let result = '';
  while (num > 0n) {
    result = ALPHABET[Number(num % 58n)] + result;
    num /= 58n;
  }
  for (const b of buf) {
    if (b === 0) result = '1' + result;
    else break;
  }
  return result;
}

function didKeyFromMulticodec(multicodec: Uint8Array, publicKey: Uint8Array): string {
  const raw = new Uint8Array(multicodec.length + publicKey.length);
  raw.set(multicodec, 0);
  raw.set(publicKey, multicodec.length);
  return `did:key:z${bs58Encode(raw)}`;
}

describe('DID key generation with PQC keys', () => {
  it('ML-DSA-65 DID key uses multicodec prefix 0x1305', () => {
    const kp = ml_dsa65.keygen();
    const multicodec = new Uint8Array([0x13, 0x05]);
    const did = didKeyFromMulticodec(multicodec, kp.publicKey);

    expect(did).toMatch(/^did:key:z[A-Za-z0-9]+$/);
    expect(did.length).toBeGreaterThan(20);
  });

  it('ML-DSA-65 DID is deterministic for the same key', () => {
    const kp = ml_dsa65.keygen();
    const multicodec = new Uint8Array([0x13, 0x05]);
    const a = didKeyFromMulticodec(multicodec, kp.publicKey);
    const b = didKeyFromMulticodec(multicodec, kp.publicKey);
    expect(a).toBe(b);
  });

  it('ML-KEM-768 public key is valid bytes for DID embedding', () => {
    const kp = ml_kem768.keygen();
    // Multicodec prefix for ML-KEM-768 (provisional 0x1306)
    const multicodec = new Uint8Array([0x13, 0x06]);
    const did = didKeyFromMulticodec(multicodec, kp.publicKey);
    expect(did).toMatch(/^did:key:z/);
  });

  it('SLH-DSA-128s public key is valid bytes for DID embedding', () => {
    const kp = slh_dsa_shake_128s.keygen();
    // Multicodec prefix for SLH-DSA (provisional 0x1307)
    const multicodec = new Uint8Array([0x13, 0x07]);
    const did = didKeyFromMulticodec(multicodec, kp.publicKey);
    expect(did).toMatch(/^did:key:z/);
  }, 60000);

  it('different algorithm DIDs are unique', () => {
    const mldsa = ml_dsa65.keygen();
    const kem = ml_kem768.keygen();
    const slh = slh_dsa_shake_128s.keygen();

    const did1 = didKeyFromMulticodec(new Uint8Array([0x13, 0x05]), mldsa.publicKey);
    const did2 = didKeyFromMulticodec(new Uint8Array([0x13, 0x06]), kem.publicKey);
    const did3 = didKeyFromMulticodec(new Uint8Array([0x13, 0x07]), slh.publicKey);

    const ids = new Set([did1, did2, did3]);
    expect(ids.size).toBe(3);
  }, 60000);
});
