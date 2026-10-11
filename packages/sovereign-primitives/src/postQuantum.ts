/**
 * P31 Post-Quantum Cryptography — Hybrid implementation
 * EXEC-05 / Gap J
 *
 * Uses @noble/post-quantum (NIST FIPS 203/204) with WebCrypto fallback.
 * Strategy: HYBRID mode — run classical + PQC simultaneously during transition.
 *
 * Key exchange: X25519 + ML-KEM-768 (Kyber) — NIST FIPS 203
 * Signatures:   Ed25519 + ML-DSA-65 (Dilithium) — NIST FIPS 204
 * Symmetric:    AES-256-GCM — NIST FIPS 197 (quantum-safe at 256-bit)
 *
 * Install: npm add @noble/post-quantum @noble/curves
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface HybridKeyPair {
  classical: { publicKey: Uint8Array<ArrayBuffer>; privateKey: Uint8Array<ArrayBuffer> };
  pqc: { publicKey: Uint8Array<ArrayBuffer>; privateKey: Uint8Array<ArrayBuffer> };
  algorithm: 'Ed25519+ML-DSA-65' | 'X25519+ML-KEM-768';
  createdAt: number;
}

export interface HybridSignature {
  classical: Uint8Array<ArrayBuffer>;
  pqc: Uint8Array<ArrayBuffer>;
  algorithm: 'Ed25519+ML-DSA-65' | 'Ed25519+SLH-DSA-128s';
}

export interface SLHDSAKeyPair {
  publicKey: Uint8Array<ArrayBuffer>;
  secretKey: Uint8Array<ArrayBuffer>;
}

export interface SLHDSASignature {
  slhdsa: Uint8Array<ArrayBuffer>;
  algorithm: 'SLH-DSA-128s';
}

export interface HybridEncrypted {
  ciphertext: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;
  kemCiphertext: Uint8Array<ArrayBuffer>; // X-Wing ciphertext (1120 bytes), self-contained
  algorithm: 'AES-256-GCM+X-Wing';
}

export interface XWingKEMKeyPair {
  publicKey: Uint8Array<ArrayBuffer>; // X-Wing public key, 1216 bytes
  secretKey: Uint8Array<ArrayBuffer>; // X-Wing secret key (32-byte seed)
  algorithm: 'X25519+ML-KEM-768 (X-Wing)';
  createdAt: number;
}

// ── WebCrypto helpers (universal: browser, CF Workers, Node 18+) ──────────

async function aesEncrypt(
  plaintext: Uint8Array<ArrayBuffer>,
  key: Uint8Array<ArrayBuffer>,
): Promise<{ ciphertext: Uint8Array<ArrayBuffer>; iv: Uint8Array<ArrayBuffer> }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key.slice(0, 32), { name: 'AES-GCM' }, false, ['encrypt'],
  );
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, plaintext);
  return { ciphertext: new Uint8Array(encrypted), iv };
}

async function aesDecrypt(
  ciphertext: Uint8Array<ArrayBuffer>,
  iv: Uint8Array<ArrayBuffer>,
  key: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key.slice(0, 32), { name: 'AES-GCM' }, false, ['decrypt'],
  );
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertext);
  return new Uint8Array(decrypted);
}

async function hkdf(
  material: Uint8Array<ArrayBuffer>,
  info: string,
  length = 32,
): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey(
    'raw', material, { name: 'HKDF' }, false, ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: new TextEncoder().encode(info) },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

// ── Attempt lazy import of @noble/post-quantum ────────────────────────────

interface MlKem768 {
  keygen(): { publicKey: Uint8Array<ArrayBuffer>; secretKey: Uint8Array<ArrayBuffer> };
  encapsulate(pk: Uint8Array<ArrayBuffer>): { cipherText: Uint8Array<ArrayBuffer>; sharedSecret: Uint8Array<ArrayBuffer> };
  decapsulate(ct: Uint8Array<ArrayBuffer>, sk: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer>;
}

interface MlDsa65 {
  keygen(): { publicKey: Uint8Array<ArrayBuffer>; secretKey: Uint8Array<ArrayBuffer> };
  sign(msg: Uint8Array<ArrayBuffer>, sk: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer>;
  verify(msg: Uint8Array<ArrayBuffer>, sig: Uint8Array<ArrayBuffer>, pk: Uint8Array<ArrayBuffer>): boolean;
}

let mlKem768: MlKem768 | null = null;
let mlDsa65: MlDsa65 | null = null;

async function loadPQC(): Promise<boolean> {
  if (mlKem768 && mlDsa65) return true;
  try {
    const kem = await import('@noble/post-quantum/ml-kem.js');
    const dsa = await import('@noble/post-quantum/ml-dsa.js');
    mlKem768 = kem.ml_kem768 as unknown as MlKem768;
    mlDsa65 = dsa.ml_dsa65 as unknown as MlDsa65;
    return true;
  } catch {
    // @noble/post-quantum not installed — run: npm add @noble/post-quantum
    return false;
  }
}

// ── X-Wing hybrid KEM (draft-connolly-cfrg-xwing-kem) ─────────────────────
// ML-KEM-768 + X25519 composed with the spec transcript combiner. Delegates to
// the maintained, KAT-validated preset `ml_kem768_x25519`. The ciphertext is
// self-contained, so decapsulation needs only the recipient's secret key.

interface XWingKEM {
  keygen(seed?: Uint8Array<ArrayBuffer>): {
    publicKey: Uint8Array<ArrayBuffer>;
    secretKey: Uint8Array<ArrayBuffer>;
  };
  encapsulate(
    publicKey: Uint8Array<ArrayBuffer>,
    msgRand?: Uint8Array<ArrayBuffer>,
  ): { cipherText: Uint8Array<ArrayBuffer>; sharedSecret: Uint8Array<ArrayBuffer> };
  decapsulate(cipherText: Uint8Array<ArrayBuffer>, secretKey: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer>;
}

let xWing: XWingKEM | null = null;

async function loadXWing(): Promise<boolean> {
  if (xWing) return true;
  try {
    const mod = await import('@noble/post-quantum/hybrid.js');
    xWing = (mod.ml_kem768_x25519 ?? mod.XWing) as unknown as XWingKEM;
    return !!xWing;
  } catch {
    return false;
  }
}

// ── SLH-DSA-128s (FIPS 205) — stateless hash-based signatures ─────────────

interface SlhDsa128s {
  keygen(): { publicKey: Uint8Array<ArrayBuffer>; secretKey: Uint8Array<ArrayBuffer> };
  sign(msg: Uint8Array<ArrayBuffer>, sk: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer>;
  verify(msg: Uint8Array<ArrayBuffer>, sig: Uint8Array<ArrayBuffer>, pk: Uint8Array<ArrayBuffer>): boolean;
}

let slhDsa128s: SlhDsa128s | null = null;

async function loadSLHDSA(): Promise<boolean> {
  if (slhDsa128s) return true;
  try {
    const mod = await import('@noble/post-quantum/slh-dsa.js');
    slhDsa128s = mod.slh_dsa_sha2_128s as unknown as SlhDsa128s;
    return true;
  } catch {
    return false;
  }
}

export async function generateSLHDSA128sKeyPair(): Promise<SLHDSAKeyPair | null> {
  const available = await loadSLHDSA();
  if (!available || !slhDsa128s) return null;
  const kp = slhDsa128s.keygen();
  return { publicKey: kp.publicKey, secretKey: kp.secretKey };
}

export async function slhdsa128sSign(
  message: Uint8Array<ArrayBuffer>,
  privateKey: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer> | null> {
  const available = await loadSLHDSA();
  if (!available || !slhDsa128s) return null;
  return slhDsa128s.sign(message, privateKey);
}

export async function slhdsa128sVerify(
  message: Uint8Array<ArrayBuffer>,
  signature: Uint8Array<ArrayBuffer>,
  publicKey: Uint8Array<ArrayBuffer>,
): Promise<boolean | null> {
  const available = await loadSLHDSA();
  if (!available || !slhDsa128s) return null;
  return slhDsa128s.verify(message, signature, publicKey);
}

export async function hybridSLHDSASign(
  message: Uint8Array<ArrayBuffer>,
  keyPair: HybridKeyPair,
  slhdsaKeys: SLHDSAKeyPair,
): Promise<HybridSignature> {
  const classicalKey = await crypto.subtle.importKey(
    'pkcs8', keyPair.classical.privateKey, 'Ed25519', false, ['sign'],
  );
  const classicalSig = new Uint8Array(
    await crypto.subtle.sign('Ed25519', classicalKey, message),
  );

  let pqcSig = new Uint8Array(0);
  const available = await loadSLHDSA();
  if (available && slhDsa128s) {
    pqcSig = slhDsa128s.sign(message, slhdsaKeys.secretKey);
  }

  return { classical: classicalSig, pqc: pqcSig, algorithm: 'Ed25519+SLH-DSA-128s' };
}

// ── Key generation ────────────────────────────────────────────────────────

export async function generateSigningKeyPair(): Promise<HybridKeyPair> {
  // Classical: Ed25519 via WebCrypto
  const classical = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);
  const classicalPub = new Uint8Array(await crypto.subtle.exportKey('raw', classical.publicKey));
  const classicalPriv = new Uint8Array(await crypto.subtle.exportKey('pkcs8', classical.privateKey));

  const pqcAvailable = await loadPQC();
  let pqcPub = new Uint8Array(0);
  let pqcPriv = new Uint8Array(0);

  if (pqcAvailable && mlDsa65) {
    const kp = mlDsa65.keygen();
    pqcPub = kp.publicKey;
    pqcPriv = kp.secretKey;
  }

  return {
    classical: { publicKey: classicalPub, privateKey: classicalPriv },
    pqc: { publicKey: pqcPub, privateKey: pqcPriv },
    algorithm: 'Ed25519+ML-DSA-65',
    createdAt: Date.now(),
  };
}

export async function generateKEMKeyPair(): Promise<XWingKEMKeyPair> {
  const available = await loadXWing();
  if (!available || !xWing) {
    throw new Error(
      'X-Wing KEM unavailable: install @noble/post-quantum (>=0.6.1) which provides ml_kem768_x25519.',
    );
  }
  const kp = xWing.keygen();
  return {
    publicKey: kp.publicKey,
    secretKey: kp.secretKey,
    algorithm: 'X25519+ML-KEM-768 (X-Wing)',
    createdAt: Date.now(),
  };
}

// ── Signing ───────────────────────────────────────────────────────────────

export async function hybridSign(
  message: Uint8Array<ArrayBuffer>,
  keyPair: HybridKeyPair,
): Promise<HybridSignature> {
  // Classical Ed25519
  const classicalKey = await crypto.subtle.importKey(
    'pkcs8', keyPair.classical.privateKey, 'Ed25519', false, ['sign'],
  );
  const classicalSig = new Uint8Array(
    await crypto.subtle.sign('Ed25519', classicalKey, message),
  );

  // ML-DSA-65
  let pqcSig = new Uint8Array(0);
  if (keyPair.pqc.privateKey.length > 0) {
    const pqcAvailable = await loadPQC();
    if (pqcAvailable && mlDsa65) {
      pqcSig = mlDsa65.sign(message, keyPair.pqc.privateKey);
    }
  }

  return { classical: classicalSig, pqc: pqcSig, algorithm: 'Ed25519+ML-DSA-65' };
}

export async function hybridVerify(
  message: Uint8Array<ArrayBuffer>,
  sig: HybridSignature,
  publicKeys: { classical: Uint8Array<ArrayBuffer>; pqc: Uint8Array<ArrayBuffer> },
): Promise<{ classicalValid: boolean; pqcValid: boolean | null }> {
  // Classical
  const classicalKey = await crypto.subtle.importKey(
    'raw', publicKeys.classical, 'Ed25519', false, ['verify'],
  );
  const classicalValid = await crypto.subtle.verify('Ed25519', classicalKey, sig.classical, message);

  // PQC
  let pqcValid: boolean | null = null;
  if (sig.pqc.length > 0 && publicKeys.pqc.length > 0) {
    const pqcAvailable = await loadPQC();
    if (pqcAvailable && mlDsa65) {
      pqcValid = mlDsa65.verify(sig.pqc, message, publicKeys.pqc);
    }
  }

  return { classicalValid, pqcValid };
}

// ── Encryption / KEM ──────────────────────────────────────────────────────

export async function hybridEncrypt(
  plaintext: Uint8Array<ArrayBuffer>,
  recipientPublicKey: Uint8Array<ArrayBuffer>,
): Promise<HybridEncrypted> {
  const available = await loadXWing();
  if (!available || !xWing) {
    throw new Error('X-Wing KEM unavailable: install @noble/post-quantum (>=0.6.1).');
  }

  // X-Wing encapsulation — ciphertext is self-contained (carries the X25519
  // ephemeral), so the recipient needs only their secret key to open it.
  const { cipherText, sharedSecret } = xWing.encapsulate(recipientPublicKey);

  const symmetricKey = await hkdf(sharedSecret, 'P31-xwing-aes-256-gcm-v1');

  // AES-256-GCM encrypt
  const { ciphertext, iv } = await aesEncrypt(plaintext, symmetricKey);

  return { ciphertext, iv, kemCiphertext: cipherText, algorithm: 'AES-256-GCM+X-Wing' };
}

export async function hybridDecrypt(
  encrypted: HybridEncrypted,
  secretKey: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> {
  const available = await loadXWing();
  if (!available || !xWing) {
    throw new Error('X-Wing KEM unavailable: install @noble/post-quantum (>=0.6.1).');
  }

  // X-Wing decapsulation
  const sharedSecret = xWing.decapsulate(encrypted.kemCiphertext, secretKey);

  // Reconstruct symmetric key
  const symmetricKey = await hkdf(sharedSecret, 'P31-xwing-aes-256-gcm-v1');

  return aesDecrypt(encrypted.ciphertext, encrypted.iv, symmetricKey);
}

// ── Readiness assessment ──────────────────────────────────────────────────

export async function assessPQCReadiness(): Promise<{
  pqcAvailable: boolean;
  slhdsaAvailable: boolean;
  xwingAvailable: boolean;
  algorithms: string[];
  nistStandards: string[];
  recommendation: string;
  migrationPhase: number;
}> {
  const available = await loadPQC();
  const slhdsaAvailable = await loadSLHDSA();
  const xwingAvailable = await loadXWing();
  const algorithms = available
    ? ['ML-KEM-768 (FIPS 203)', 'ML-DSA-65 (FIPS 204)']
    : ['Ed25519 (classical only)'];
  if (xwingAvailable) algorithms.push('X-Wing: X25519+ML-KEM-768 (draft-connolly-cfrg-xwing-kem)');
  if (slhdsaAvailable) algorithms.push('SLH-DSA-128s (FIPS 205)');
  return {
    pqcAvailable: available,
    slhdsaAvailable,
    xwingAvailable,
    algorithms,
    nistStandards: ['FIPS 203', 'FIPS 204', 'FIPS 205', 'FIPS 197'],
    recommendation: available
      ? slhdsaAvailable
        ? 'Hybrid mode active. X-Wing KEM + ML-DSA-65 + SLH-DSA-128s on all new keys.'
        : 'Hybrid mode active. X-Wing KEM + PQC signatures on all new keys.'
      : 'Install @noble/post-quantum: npm add @noble/post-quantum. Classical only until installed.',
    migrationPhase: available ? (slhdsaAvailable ? 3 : 2) : 1,
  };
}

// ── Legacy compat shim (replaces the old stub-based PostQuantumCryptoManager) ──

export const QUANTUM_SAFE_CONFIG = {
  defaultAlgorithm: 'X-Wing (X25519+ML-KEM-768)' as const,
  signatureAlgorithm: 'ML-DSA-65' as const,
  slhdsaAlgorithm: 'SLH-DSA-128s' as const,
  hybridEncryption: true,
  nistStandards: { kem: 'FIPS 203', sig: 'FIPS 204', slhdsa: 'FIPS 205', sym: 'FIPS 197' },
};
