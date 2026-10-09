/**
 * Composite Ed25519 + ML-DSA-65 signatures + capability tokens — the P31 PQC
 * auth core. Fail-closed: any tamper / expiry / audience / room / capability
 * mismatch must reject.
 */

import { describe, it, expect } from 'vitest';
import {
  generateCompositeKeyPair,
  compositeSign,
  compositeVerify,
  compositePublicKey,
  ED25519_SIG_LEN,
  MLDSA65_SIG_LEN,
} from './composite';
import {
  mintCapabilityToken,
  verifyCapabilityToken,
  verifySelfContainedCapabilityToken,
  compositeKeyFingerprint,
  tokenKid,
  type CapabilityClaims,
} from './capabilityToken';
import { base64urlEncode } from './composite';
import { probeNativeMLDSA } from './composite';

describe('composite Ed25519 + ML-DSA-65', () => {
  it('generates keys with the expected component lengths', async () => {
    const kp = await generateCompositeKeyPair();
    expect(kp.ed25519.publicKey.length).toBe(32);
    expect(kp.mlDsa65.publicKey.length).toBe(1952);
    expect(kp.mlDsa65.privateKey.length).toBe(4032);
  });

  it('signs and verifies a message', async () => {
    const kp = await generateCompositeKeyPair();
    const message = new TextEncoder().encode('p31 pqc auth assertion');
    const sig = await compositeSign(message, kp);
    expect(sig.ed25519.length).toBe(ED25519_SIG_LEN);
    expect(sig.mlDsa65.length).toBe(MLDSA65_SIG_LEN);
    expect(await compositeVerify(message, sig, compositePublicKey(kp))).toBe(true);
  });

  it('rejects a tampered message', async () => {
    const kp = await generateCompositeKeyPair();
    const sig = await compositeSign(new TextEncoder().encode('original'), kp);
    const tampered = await compositeVerify(
      new TextEncoder().encode('tampered'),
      sig,
      compositePublicKey(kp),
    );
    expect(tampered).toBe(false);
  });

  it('rejects a signature from a different keypair', async () => {
    const signer = await generateCompositeKeyPair();
    const other = await generateCompositeKeyPair();
    const sig = await compositeSign(new TextEncoder().encode('msg'), signer);
    expect(await compositeVerify(new TextEncoder().encode('msg'), sig, compositePublicKey(other))).toBe(false);
  });
});

function claims(over: Partial<CapabilityClaims> = {}): CapabilityClaims {
  const iat = Date.now();
  return {
    iss: 'did:key:z6Mkissuer',
    aud: 'p31-doc-relay',
    room: 'doc_123',
    caps: ['read', 'write'],
    iat,
    exp: iat + 60_000,
    ...over,
  };
}

describe('capability tokens', () => {
  it('mints and verifies a token for the matching key', async () => {
    const kp = await generateCompositeKeyPair();
    const token = await mintCapabilityToken(claims(), kp);
    const verified = await verifyCapabilityToken(token, compositePublicKey(kp), {
      expectAud: 'p31-doc-relay',
      expectRoom: 'doc_123',
    });
    expect(verified).toMatchObject({ room: 'doc_123', caps: ['read', 'write'] });
  });

  it('rejects an expired token', async () => {
    const kp = await generateCompositeKeyPair();
    const token = await mintCapabilityToken(claims({ exp: Date.now() - 60_000 }), kp);
    const verified = await verifyCapabilityToken(token, compositePublicKey(kp));
    expect(verified).toBeNull();
  });

  it('rejects a wrong audience', async () => {
    const kp = await generateCompositeKeyPair();
    const token = await mintCapabilityToken(claims({ aud: 'other-service' }), kp);
    expect(await verifyCapabilityToken(token, compositePublicKey(kp), { expectAud: 'p31-doc-relay' })).toBeNull();
  });

  it('rejects a wrong room', async () => {
    const kp = await generateCompositeKeyPair();
    const token = await mintCapabilityToken(claims(), kp);
    expect(await verifyCapabilityToken(token, compositePublicKey(kp), { expectRoom: 'doc_other' })).toBeNull();
  });

  it('rejects a token missing a required capability', async () => {
    const kp = await generateCompositeKeyPair();
    const token = await mintCapabilityToken(claims({ caps: ['read'] }), kp);
    expect(await verifyCapabilityToken(token, compositePublicKey(kp), { requireCaps: ['write'] })).toBeNull();
  });

  it('rejects a tampered token', async () => {
    const kp = await generateCompositeKeyPair();
    const token = await mintCapabilityToken(claims(), kp);
    const [h, p, s] = token.split('.');
    const tampered = `${h}.${p}b.${s}`;
    expect(await verifyCapabilityToken(tampered, compositePublicKey(kp))).toBeNull();
  });

  it('rejects a token signed by a different key', async () => {
    const issuer = await generateCompositeKeyPair();
    const attacker = await generateCompositeKeyPair();
    const token = await mintCapabilityToken(claims(), issuer);
    expect(await verifyCapabilityToken(token, compositePublicKey(attacker))).toBeNull();
  });

  it('rejects structurally invalid tokens', async () => {
    const kp = await generateCompositeKeyPair();
    expect(await verifyCapabilityToken('not-a-token', compositePublicKey(kp))).toBeNull();
    expect(await verifyCapabilityToken('a.b', compositePublicKey(kp))).toBeNull();
  });

  it('verifies a self-contained token without a key registry', async () => {
    const kp = await generateCompositeKeyPair();
    const pub = compositePublicKey(kp);
    const token = await mintCapabilityToken(
      claims({
        pk: { ed25519: base64urlEncode(pub.ed25519), mlDsa65: base64urlEncode(pub.mlDsa65) },
      }),
      kp,
    );
    const verified = await verifySelfContainedCapabilityToken(token, {
      expectAud: 'p31-doc-relay',
      expectRoom: 'doc_123',
    });
    expect(verified).toMatchObject({ room: 'doc_123', caps: ['read', 'write'] });
  });

  it('rejects a self-contained token signed by a different key than claims.pk', async () => {
    const signer = await generateCompositeKeyPair();
    const other = await generateCompositeKeyPair();
    const otherPub = compositePublicKey(other);
    const token = await mintCapabilityToken(
      claims({ pk: { ed25519: base64urlEncode(otherPub.ed25519), mlDsa65: base64urlEncode(otherPub.mlDsa65) } }),
      signer,
    );
    expect(await verifySelfContainedCapabilityToken(token)).toBeNull();
  });

  it('rejects a self-contained token missing claims.pk', async () => {
    const kp = await generateCompositeKeyPair();
    const token = await mintCapabilityToken(claims(), kp);
    expect(await verifySelfContainedCapabilityToken(token)).toBeNull();
  });
});

describe('native WebCrypto ML-DSA probe', () => {
  it('returns a boolean (best-effort detection)', async () => {
    expect(typeof (await probeNativeMLDSA())).toBe('boolean');
  });
});

describe('capability token kid / key rotation', () => {
  it('writes the composite key fingerprint into the protected header by default', async () => {
    const kp = await generateCompositeKeyPair();
    const pub = compositePublicKey(kp);
    const token = await mintCapabilityToken(claims(), kp);
    expect(tokenKid(token)).toBe(await compositeKeyFingerprint(pub));
  });

  it('accepts an explicit kid', async () => {
    const kp = await generateCompositeKeyPair();
    const token = await mintCapabilityToken(claims(), kp, 'kid-2026-09');
    expect(tokenKid(token)).toBe('kid-2026-09');
  });

  it('is deterministic for the same keypair and distinct across keypairs', async () => {
    const a = await generateCompositeKeyPair();
    const b = await generateCompositeKeyPair();
    expect(await compositeKeyFingerprint(compositePublicKey(a))).toBe(
      await compositeKeyFingerprint(compositePublicKey(a)),
    );
    expect(await compositeKeyFingerprint(compositePublicKey(a))).not.toBe(
      await compositeKeyFingerprint(compositePublicKey(b)),
    );
  });

  it('enforces expectKid (rotation): matching kid verifies, mismatch rejects', async () => {
    const kp = await generateCompositeKeyPair();
    const pub = compositePublicKey(kp);
    const kid = await compositeKeyFingerprint(pub);
    const token = await mintCapabilityToken(claims(), kp);
    expect(await verifyCapabilityToken(token, pub, { expectKid: kid })).not.toBeNull();
    expect(await verifyCapabilityToken(token, pub, { expectKid: 'superseded-kid' })).toBeNull();
  });

  it('enforces expectKid on self-contained tokens', async () => {
    const kp = await generateCompositeKeyPair();
    const pub = compositePublicKey(kp);
    const token = await mintCapabilityToken(
      claims({ pk: { ed25519: base64urlEncode(pub.ed25519), mlDsa65: base64urlEncode(pub.mlDsa65) } }),
      kp,
    );
    expect(await verifySelfContainedCapabilityToken(token, { expectKid: tokenKid(token)! })).not.toBeNull();
    expect(await verifySelfContainedCapabilityToken(token, { expectKid: 'wrong' })).toBeNull();
  });
});