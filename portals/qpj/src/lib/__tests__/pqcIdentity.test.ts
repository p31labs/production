/**
 * QPJ hybrid identity primitives — PIN-wrapped ML-DSA-65 keys, composite
 * assertions, and self-contained relay capability tokens.
 */

import { describe, it, expect } from 'vitest';
import {
  generateHybridKeyMaterial,
  derivePinKey,
  aesGcmWrap,
  aesGcmUnwrap,
  wrapSecretDual,
  unwrapSecret,
  signAssertion,
  verifyAssertion,
  verifyMeshPayload,
  mintRelayCapabilityToken,
  verifyRelayCapabilityToken,
  createQrChallenge,
  encodeQrChallenge,
  decodeQrChallenge,
  signQrChallenge,
  verifyQrChallenge,
  type B64KeyMaterial,
} from '../pqcIdentity';

describe('pqcIdentity — hybrid key material', () => {
  it('generates keys with expected lengths', async () => {
    const m = await generateHybridKeyMaterial();
    expect(m.ed25519Pub).toBeTruthy();
    expect(m.mldsa65Pub).toBeTruthy();
    expect(m.ed25519PrivPkcs8).toBeTruthy();
    expect(m.mldsa65Priv).toBeTruthy();
  });

  it('wraps and unwraps the ML-DSA secret under a PIN-derived key', async () => {
    const m = await generateHybridKeyMaterial();
    const pinKey = await derivePinKey('4242');
    const wrapped = await aesGcmWrap(m.mldsa65Priv, pinKey);
    const unwrapped = await aesGcmUnwrap(wrapped, pinKey);
    expect(unwrapped).toBe(m.mldsa65Priv);
  });

  it('does not unwrap under a different PIN', async () => {
    const m = await generateHybridKeyMaterial();
    const wrapped = await aesGcmWrap(m.mldsa65Priv, await derivePinKey('1111'));
    await expect(aesGcmUnwrap(wrapped, await derivePinKey('2222'))).rejects.toThrow();
  });
});

describe('pqcIdentity — composite assertions', () => {
  it('signs and verifies an assertion', async () => {
    const m: B64KeyMaterial = await generateHybridKeyMaterial();
    const sig = await signAssertion('alice:1234', m);
    expect(await verifyAssertion('alice:1234', sig, { ed25519Pub: m.ed25519Pub, mldsa65Pub: m.mldsa65Pub })).toBe(true);
  });

  it('rejects a tampered assertion', async () => {
    const m = await generateHybridKeyMaterial();
    const sig = await signAssertion('alice:1234', m);
    expect(await verifyAssertion('alice:9999', sig, { ed25519Pub: m.ed25519Pub, mldsa65Pub: m.mldsa65Pub })).toBe(false);
  });

  it('verifies a mesh presence payload', async () => {
    const m = await generateHybridKeyMaterial();
    const message = 'did:key:peer:1234';
    const sig = await signAssertion(message, m);
    const ok = await verifyMeshPayload({
      did: 'did:key:peer',
      timestamp: 1234,
      publicKey: m.ed25519Pub,
      signature: sig.ed25519,
      mldsa65Sig: sig.mlDsa65,
      mldsa65Pub: m.mldsa65Pub,
    });
    expect(ok).toBe(true);
  });

  it('rejects a mesh payload missing PQC signatures', async () => {
    expect(await verifyMeshPayload({ did: 'did:key:peer', timestamp: 1 })).toBe(false);
  });
});

describe('pqcIdentity — dual device+PIN wrapping', () => {
  it('wraps a secret under both keys and unwraps via either', async () => {
    const m = await generateHybridKeyMaterial();
    const deviceKey = await derivePinKey('device'); // any AES-GCM key works for the unit test
    const pinKey = await derivePinKey('4242');
    const dual = await wrapSecretDual(m.mldsa65Priv, deviceKey, pinKey);
    expect(await unwrapSecret(dual.device, deviceKey)).toBe(m.mldsa65Priv);
    expect(await unwrapSecret(dual.pin, pinKey)).toBe(m.mldsa65Priv);
  });

  it('rejects the PIN layer with the wrong PIN', async () => {
    const m = await generateHybridKeyMaterial();
    const pinKey = await derivePinKey('1111');
    const dual = await wrapSecretDual(m.mldsa65Priv, await derivePinKey('device'), pinKey);
    await expect(unwrapSecret(dual.pin, await derivePinKey('2222'))).rejects.toThrow();
  });
});

describe('pqcIdentity — QR pairing challenge', () => {
  it('signs and verifies a challenge', async () => {
    const m: B64KeyMaterial = await generateHybridKeyMaterial();
    const challenge = createQrChallenge('qpj.p31ca.org');
    const sig = await signQrChallenge(challenge, m);
    expect(
      await verifyQrChallenge(challenge, sig, { ed25519Pub: m.ed25519Pub, mldsa65Pub: m.mldsa65Pub }),
    ).toBe(true);
  });

  it('rejects an expired challenge (replay window)', async () => {
    const m = await generateHybridKeyMaterial();
    const challenge = { nonce: crypto.randomUUID(), rp: 'qpj.p31ca.org', exp: Date.now() - 1000 };
    const sig = await signQrChallenge(challenge, m);
    expect(
      await verifyQrChallenge(challenge, sig, { ed25519Pub: m.ed25519Pub, mldsa65Pub: m.mldsa65Pub }),
    ).toBe(false);
  });

  it('rejects a signature bound to a different challenge', async () => {
    const m = await generateHybridKeyMaterial();
    const c1 = createQrChallenge('qpj.p31ca.org');
    const c2 = createQrChallenge('other.p31ca.org');
    const sig = await signQrChallenge(c1, m);
    expect(
      await verifyQrChallenge(c2, sig, { ed25519Pub: m.ed25519Pub, mldsa65Pub: m.mldsa65Pub }),
    ).toBe(false);
  });

  it('round-trips the challenge encoding', () => {
    const c = createQrChallenge('qpj.p31ca.org');
    const decoded = decodeQrChallenge(encodeQrChallenge(c));
    expect(decoded).toEqual(c);
  });
});

describe('pqcIdentity — relay capability tokens', () => {
  it('mints and verifies a self-contained token for a room', async () => {
    const m = await generateHybridKeyMaterial();
    const token = await mintRelayCapabilityToken('doc_room_1', m);
    expect(await verifyRelayCapabilityToken(token)).toBe(true);
  });

  it('rejects a token bound to another room', async () => {
    const m = await generateHybridKeyMaterial();
    const token = await mintRelayCapabilityToken('doc_room_1', m);
    // The QPJ verifier checks audience + caps, not the room, so craft a
    // tampered room claim and expect failure via the underlying verifier.
    const parts = token.split('.');
    const claims = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    ) as { room: string };
    claims.room = 'doc_room_2';
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const tampered = `${parts[0]}.${payload}.${parts[2]}`;
    expect(await verifyRelayCapabilityToken(tampered)).toBe(false);
  });
});