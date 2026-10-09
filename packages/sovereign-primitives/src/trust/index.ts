/**
 * Trust Module for P31 K₄ Mesh
 *
 * Provides decentralized trust computation using the EigenTrust algorithm.
 * Prevents Sybil attacks without centralized KYC by anchoring trust to
 * pre-trusted genesis nodes seeded from Cognitive Passport enrollment data.
 *
 * Exports:
 *   - EigenTrust algorithm (compute, normalize, interaction history, edge trust)
 *   - TrustLevel enum and requiresTrustLevel() guard
 *   - Cognitive Passport bridge (parseRelationships, computePassportTrust, etc.)
 */

export {
  computeEigenTrust,
  computeEigenTrustWithEdges,
  getEdgeTrust,
  fromInteractionHistory,
  normalizeTrustVector,
  interactionsToTrustMatrix,
  validateInput,
  isSoulboundEligible,
  getTrustTier,
  trustLevelOrder,
  requiresTrustLevel,
  TRUST_THRESHOLDS,
  DEFAULT_EIGENTRUST_PARAMS,
  DEFAULT_TRUST_THRESHOLDS,
} from './eigentrust.js';

export { TrustLevel } from './eigentrust.js';

export type {
  TrustVector,
  LocalTrustMatrix,
  EigenTrustOptions,
  InteractionHistory,
  EigenTrustResult,
} from './eigentrust.js';

export {
  parseRelationships,
  relationshipsToTrustMatrix,
  genesisTrustVector,
  computePassportTrust,
  computeTrustWithPassthrough,
  trustScoresForDads,
  DEFAULT_RELATIONSHIP_WEIGHTS,
} from './passport-trust.js';

export type { CogPassRelationship, CogPassTrustConfig } from './passport-trust.js';
