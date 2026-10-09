// computeTrustScore — single source of truth for the P31 trust score.
// Replaces the two divergent inline implementations that lived in
// ProfilePage.tsx and TrustDashboard.tsx. Both agreed on the weights;
// this module is now the canonical authority.

export interface TrustScoreInput {
  /** KEL chain present and valid (verified hash chain of key events). */
  kelValid: boolean;
  /** PQC keys present and freshly rotated (Ed25519 + ML-DSA-65 ready). */
  keysFresh: boolean;
  /** Number of issued credentials / SBTs held. */
  credentialCount: number;
  /** Number of mesh peers that have attested to this identity. */
  peerAttestations: number;
}

export type TrustLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface TrustScore {
  /** 0–100 weighted score. */
  score: number;
  level: TrustLevel;
  /** CSS color token var for the level. */
  color: string;
}

export const TRUST_WEIGHTS = {
  kel: 25,
  keys: 25,
  credentials: { threshold: 3, full: 30, partial: 15 },
  peers: { threshold: 2, full: 20, partial: 10 },
} as const;

export const TRUST_LEVEL_COLORS: Record<TrustLevel, string> = {
  HIGH: 'var(--p31-accent-green)',
  MEDIUM: 'var(--p31-accent-gold)',
  LOW: 'var(--p31-accent-red)',
};

export function trustLevelForScore(score: number): TrustLevel {
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

export function computeTrustScore(input: TrustScoreInput): TrustScore {
  let score = 0;
  if (input.kelValid) score += TRUST_WEIGHTS.kel;
  if (input.keysFresh) score += TRUST_WEIGHTS.keys;
  if (input.credentialCount >= TRUST_WEIGHTS.credentials.threshold) score += TRUST_WEIGHTS.credentials.full;
  else if (input.credentialCount >= 1) score += TRUST_WEIGHTS.credentials.partial;
  if (input.peerAttestations >= TRUST_WEIGHTS.peers.threshold) score += TRUST_WEIGHTS.peers.full;
  else if (input.peerAttestations >= 1) score += TRUST_WEIGHTS.peers.partial;

  const level = trustLevelForScore(score);
  return { score, level, color: TRUST_LEVEL_COLORS[level] };
}
