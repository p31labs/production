import { describe, it, expect } from 'vitest';
import {
  mergePassport,
  PASSPORT_SCHEMA_VERSION,
  type CognitivePassportLive,
} from '../cognitivePassport.schema';
const live: CognitivePassportLive = {
  version: 2,
  did: 'did:key:z6MkExample',
  keys: { ed25519: 'pub-b64', mldsa65: 'mldsa-b64' },
  sbts: [{ id: 'sbt-1', type: 'achievement', issuedAt: 1700000000000 }],
  cognitive: { spoons: 3, r: 0.8, phase: 'full', mode: 'wye', careScore: 0.6 },
  love: { sovereignty: 10, performance: 5, frozen: 2 },
  kel: { count: 3, latestSaid: 'said-abc' },
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('cognitivePassport.schema', () => {
  it('exports the unified schema version', () => {
    expect(PASSPORT_SCHEMA_VERSION).toBe(2);
  });

  it('mergePassport carries v4.1.0 content fields through', () => {
    const merged = mergePassport(live, {
      identity: { displayName: 'SJ', role: 'CHILD' },
      accessibility: { screenComfort: 2, motionPreference: 'reduced', contrastPreference: 'standard', fontSize: 14, density: 1 },
      created: '2026-01-01T00:00:00.000Z',
      did: 'did:key:z6MkExample',
      face: '<svg></svg>',
    });
    expect(merged.did).toBe('did:key:z6MkExample');
    expect(merged.identity?.displayName).toBe('SJ');
    expect(merged.face).toBe('<svg></svg>');
    expect(merged.cognitive?.phase).toBe('full');
    expect(merged.love?.sovereignty).toBe(10);
    expect(merged.kel?.count).toBe(3);
  });

  it('mergePassport handles a missing content document', () => {
    const merged = mergePassport(live, null);
    expect(merged.did).toBe('did:key:z6MkExample');
    expect(merged.keys?.ed25519).toBe('pub-b64');
  });

  it('schema is a superset: live fields are additive to v4.1.0', () => {
    const merged = mergePassport(live, null);
    expect(merged).toHaveProperty('version');
    expect(merged).toHaveProperty('keys');
    expect(merged).toHaveProperty('sbts');
    expect(merged).toHaveProperty('cognitive');
    expect(merged).toHaveProperty('love');
    expect(merged).toHaveProperty('kel');
    expect(merged).toHaveProperty('updatedAt');
  });
});
