import { describe, it, expect } from 'vitest';
import { assembleCogPass, exportCogPassJSON } from '../lib/cogpass';
import type { Identity } from '../lib/identity';

const mockIdentity: Identity = {
  did: 'did:key:zmockdid1234567890',
  name: 'Dillpickle',
  avatar: '🧸',
  accentHue: 75,
  createdAt: 1700000000000,
  verified: true,
};

describe('CogPass', () => {
  it('assembles all four vertices from identity + profile', () => {
    const cogpass = assembleCogPass(mockIdentity);

    expect(cogpass.version).toBe(1);
    expect(cogpass.issuedAt).toBeGreaterThan(0);
    expect(cogpass.identity.did).toBe(mockIdentity.did);
    expect(cogpass.identity.name).toBe('Dillpickle');
    expect(cogpass.tetrahedron.vertices).toHaveLength(4);

    const types = cogpass.tetrahedron.vertices.map((v) => v.type);
    expect(types).toEqual(['did', 'reputation', 'preferences', 'relations']);
  });

  it('populates did vertex from identity', () => {
    const cogpass = assembleCogPass(mockIdentity);
    const didVertex = cogpass.tetrahedron.vertices[0];
    expect(didVertex.type).toBe('did');
    expect(didVertex.value).toBe(mockIdentity.did);
  });

  it('export produces valid JSON round-trip', () => {
    const cogpass = assembleCogPass(mockIdentity);
    const json = exportCogPassJSON(cogpass);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.identity.did).toBe(mockIdentity.did);
    expect(parsed.tetrahedron.vertices).toHaveLength(4);
  });

  it('each vertex carries its correct value shape', () => {
    const cogpass = assembleCogPass(mockIdentity);

    const prefs = cogpass.tetrahedron.vertices[2].value as {
      spoons: number;
      motionScale?: number;
      breathPattern?: string;
      contrastTarget?: string;
    };
    expect(typeof prefs.spoons).toBe('number');
    expect(typeof prefs.motionScale).toBe('number');
    expect(['4-4-6', '5-5-5', '4-7-8']).toContain(prefs.breathPattern);
    expect(['AA', 'AAA', 'APCA-60', 'APCA-75']).toContain(prefs.contrastTarget);
  });
});
