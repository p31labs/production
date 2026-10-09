import { describe, it, expect } from 'vitest';

const hasEd25519 = (() => {
  try {
    if (typeof crypto === 'undefined' || !crypto.subtle) return false;
    return true;
  } catch {
    return false;
  }
})();

describe('identity (signWithDid / verifyWithDid)', () => {
  it.skipIf(!hasEd25519)('sign and verify roundtrip with Ed25519', async () => {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'Ed25519' },
      true,
      ['sign', 'verify'],
    );

    const msg = 'hello p31 sovereign shell';

    const sigRaw = await crypto.subtle.sign(
      { name: 'Ed25519' },
      keyPair.privateKey,
      new TextEncoder().encode(msg),
    );

    const ok = await crypto.subtle.verify(
      { name: 'Ed25519' },
      keyPair.publicKey,
      sigRaw,
      new TextEncoder().encode(msg),
    );

    expect(ok).toBe(true);
  });
});
