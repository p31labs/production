import { describe, expect, it } from 'vitest';
import { encryptKey, resolveKey, sha256Fingerprint } from './credentials';

const credentialKey = () => btoa('x'.repeat(32));

describe('credentials', () => {
  it('sha256Fingerprint is a stable 12-hex lowercase string', async () => {
    expect(await sha256Fingerprint('sk-test')).toBe(await sha256Fingerprint('sk-test'));
    expect(await sha256Fingerprint('sk-test')).toMatch(/^[0-9a-f]{12}$/);
  });

  it('encryptKey round-trips through AES-256-GCM', async () => {
    const env = { CREDENTIAL_KEY: credentialKey() } as any;
    const plaintext = 'sk-live-secret';
    const { ciphertext, iv } = await encryptKey(env, plaintext);

    expect(ciphertext).toBeInstanceOf(Uint8Array);
    expect(iv).toBeInstanceOf(Uint8Array);
    expect(iv).toHaveLength(12);
    expect(ciphertext.length).toBeGreaterThan(0);

    const raw = Uint8Array.from(atob(env.CREDENTIAL_KEY), (c) => c.charCodeAt(0));
    const master = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
    const recovered = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      master,
      ciphertext as BufferSource,
    );
    expect(new TextDecoder().decode(recovered)).toBe(plaintext);
  });

  it('resolveKey fails closed (null) when no row matches', async () => {
    const env = {
      CREDENTIAL_KEY: credentialKey(),
      DB: { prepare: () => ({ bind: () => ({ first: async () => null }) }) },
    } as any;
    expect(await resolveKey(env, 'did:key:user1', 'workers-ai')).toBeNull();
  });

  it('resolveKey fails closed (null) without CREDENTIAL_KEY', async () => {
    const env = {
      DB: {
        prepare: () => ({
          bind: () => ({
            first: async () => {
              throw new Error('DB must not be hit');
            },
          }),
        }),
      },
    } as any;
    expect(await resolveKey(env, 'did:key:user1', 'workers-ai')).toBeNull();
  });
});