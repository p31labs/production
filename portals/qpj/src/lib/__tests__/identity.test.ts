import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  setDeviceKey,
  createIdentity,
  loadIdentity,
  ensureIdentity,
  generateEd25519Did,
} from '../identity';

describe('identity — crypto round-trip', () => {
  beforeEach(async () => {
    localStorage.clear();
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );
    setDeviceKey(key);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('generateEd25519Did produces a did:key URL', async () => {
    const { did } = await generateEd25519Did();
    expect(did).toMatch(/^did:key:z/);
    expect(did.length).toBeGreaterThan(20);
  });

  it('createIdentity persists an encrypted private key', async () => {
    const id = await createIdentity('dillpickle', { name: 'Dillpickle', avatar: '🛰️', accentHue: 235 });
    expect(id.did).toMatch(/^did:key:z/);
    expect(id.name).toBe('Dillpickle');
    expect(id.avatar).toBe('🛰️');
    expect(id.accentHue).toBe(235);
    expect(id.verified).toBe(true);

    const raw = JSON.parse(localStorage.getItem('qpj:identity:dillpickle')!);
    expect(raw.did).toBe(id.did);
    expect(raw.iv).toBeTruthy();
    expect(raw.ciphertext).toBeTruthy();
    expect(raw).not.toHaveProperty('privateKey');
    expect(raw.ciphertext).not.toBe(raw.did);
  });

  it('loadIdentity round-trips the record', async () => {
    await createIdentity('dillpickle', { name: 'Dillpickle', avatar: '🛰️', accentHue: 235 });
    const loaded = await loadIdentity('dillpickle');
    expect(loaded?.did).not.toBeNull();
    expect(loaded?.name).toBe('Dillpickle');
    expect(loaded?.verified).toBe(true);
  });

  it('createIdentity is idempotent', async () => {
    const first = await createIdentity('dillpickle', { name: 'Dillpickle', avatar: '🛰️', accentHue: 235 });
    const second = await createIdentity('dillpickle', { name: 'ShouldNotOverwrite', avatar: '🐙', accentHue: 350 });
    expect(second.did).toBe(first.did);
  });

  it('ensureIdentity returns null when none exists', async () => {
    const existing = await ensureIdentity('noone');
    expect(existing).toBeNull();
  });
});
