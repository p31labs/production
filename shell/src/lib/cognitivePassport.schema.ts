// cognitivePassport.schema — unified Cognitive Passport schema.
//
// Source of truth: @p31ca/ui/passport v4.1.0 content document, extended with
// the shell's live telemetry fields (r, phase, mode, careScore, keys, SBTs,
// LOVE balances, KEL summary). This is the single schema shared by the shell,
// the portals, and the PassportIdentitySection component.

import type {
  CognitivePassport as PassportV4,
  PassportIdentity,
  PassportCognition,
  PassportCommunication,
  PassportAccessibility,
  PassportExportProfiles,
} from '@p31ca/ui/passport/schema';

export type { PassportIdentity, PassportCognition, PassportCommunication, PassportAccessibility, PassportExportProfiles };

export type CognitivePhase = 'low' | 'mid' | 'full';
export type CognitiveMode = 'wye' | 'delta';

export interface PassportKeys {
  ed25519: string;
  mldsa65?: string;
  slhdsa128s?: string;
}

export interface PassportSbt {
  id: string;
  type?: string;
  issuedAt?: number;
}

export interface PassportCognitiveTelemetry {
  spoons: number;
  r: number;
  phase: CognitivePhase;
  mode: CognitiveMode;
  careScore: number;
}

export interface PassportLove {
  sovereignty: number;
  performance: number;
  frozen?: number;
}

export interface PassportKel {
  count: number;
  latestSaid?: string;
}

/**
 * Live state snapshot — the shell's buildPassport() output.
 * A pure telemetry view of the identity wallet at a point in time.
 */
export interface CognitivePassportLive {
  version: 2;
  did: string;
  keys: PassportKeys;
  sbts: PassportSbt[];
  cognitive: PassportCognitiveTelemetry;
  love: PassportLove;
  kel: PassportKel;
  updatedAt: string;
}

/**
 * Unified Cognitive Passport — v4.1.0 content document merged with live
 * telemetry. This is what the Identity Wallet, portals, and exports produce
 * and consume. v4.1.0 content fields remain the contract; the live fields are
 * an additive extension so older content documents keep working.
 */
export type UnifiedCognitivePassport = PassportV4 & Partial<CognitivePassportLive>;

export const PASSPORT_SCHEMA_VERSION = 2;

export function mergePassport(
  live: CognitivePassportLive,
  content?: PassportV4 | null,
): UnifiedCognitivePassport {
  return { ...(content ?? {}), ...live } as UnifiedCognitivePassport;
}
