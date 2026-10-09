import { describe, it, expect } from 'vitest';
import { computeTrustScore, trustLevelForScore, TRUST_WEIGHTS, TRUST_LEVEL_COLORS } from '../../features/identity-wallet/computeTrustScore';

describe('computeTrustScore', () => {
  it('starts at 0 when nothing is satisfied', () => {
    const t = computeTrustScore({ kelValid: false, keysFresh: false, credentialCount: 0, peerAttestations: 0 });
    expect(t.score).toBe(0);
    expect(t.level).toBe('LOW');
  });

  it('rewards each pillar at full weight', () => {
    const t = computeTrustScore({ kelValid: true, keysFresh: true, credentialCount: 3, peerAttestations: 2 });
    expect(t.score).toBe(TRUST_WEIGHTS.kel + TRUST_WEIGHTS.keys + TRUST_WEIGHTS.credentials.full + TRUST_WEIGHTS.peers.full);
    expect(t.score).toBe(100);
    expect(t.level).toBe('HIGH');
  });

  it('gives partial credit for a single credential', () => {
    const t = computeTrustScore({ kelValid: false, keysFresh: false, credentialCount: 1, peerAttestations: 0 });
    expect(t.score).toBe(TRUST_WEIGHTS.credentials.partial);
    expect(t.level).toBe('LOW');
  });

  it('gives partial credit for a single peer attestation', () => {
    const t = computeTrustScore({ kelValid: false, keysFresh: false, credentialCount: 0, peerAttestations: 1 });
    expect(t.score).toBe(TRUST_WEIGHTS.peers.partial);
  });

  it('maps score to MEDIUM in the middle band', () => {
    const t = computeTrustScore({ kelValid: true, keysFresh: true, credentialCount: 0, peerAttestations: 0 });
    expect(t.score).toBe(50);
    expect(t.level).toBe('MEDIUM');
  });

  it('uses the canonical color tokens', () => {
    const high = computeTrustScore({ kelValid: true, keysFresh: true, credentialCount: 3, peerAttestations: 2 });
    expect(high.color).toBe(TRUST_LEVEL_COLORS.HIGH);
    expect(TRUST_LEVEL_COLORS.LOW).toBe('var(--p31-accent-red)');
  });

  it('trustLevelForScore boundary mapping', () => {
    expect(trustLevelForScore(100)).toBe('HIGH');
    expect(trustLevelForScore(70)).toBe('HIGH');
    expect(trustLevelForScore(69)).toBe('MEDIUM');
    expect(trustLevelForScore(40)).toBe('MEDIUM');
    expect(trustLevelForScore(39)).toBe('LOW');
  });
});
