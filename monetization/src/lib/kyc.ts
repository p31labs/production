/**
 * kyc — progressive KYC tier model, powered by the Phenix sovereign wallet.
 *
 * Tier 0 — browse only. No identity. All read surfaces + free tools available.
 * Tier 1 — sovereign identity connected (Ed25519 did:key). Unlocks identity-bound
 *          reads and contribution attestation.
 * Tier 2 — identity + a `p31.identity` self-attested credential stored in the
 *          Phenix wallet. Required for operator-gated capital actions
 *          (allocator.rebalance, compounder.trigger, opportunities.execute).
 *
 * Progressive by design: no document scan at any tier. Deferred KYC — the
 * "friction budget" pattern — a full verification is never demanded up front.
 */
import { loadIdentity } from './identity';
import { PHENIX_WALLET, type WalletCredential } from './phenixWallet';

export type KycTier = 0 | 1 | 2;

export const IDENTITY_VCT = 'p31.identity';

export interface KycState {
  tier: KycTier;
  identityDid: string | null;
  vaultExists: boolean;
  credentials: WalletCredential[];
}

/** Current progressive-KYC state, derived live from the Phenix wallet. */
export function getKycState(): KycState {
  const identity = loadIdentity();
  const wallet = PHENIX_WALLET.status();
  const credentials = PHENIX_WALLET.credentials();
  const hasIdentityCred = credentials.some((c) => c.vct === IDENTITY_VCT);
  const tier: KycTier = identity ? (hasIdentityCred ? 2 : 1) : 0;
  return {
    tier,
    identityDid: identity?.did ?? null,
    vaultExists: wallet.exists,
    credentials,
  };
}

export function requireTier(state: KycState, needed: KycTier): boolean {
  return state.tier >= needed;
}

export const TIER_META: Record<KycTier, { label: string; blurb: string }> = {
  0: { label: 'Tier 0 — Browse', blurb: 'Read every surface and free tool. No identity needed.' },
  1: { label: 'Tier 1 — Identity', blurb: 'Sovereign did:key connected. Identity-bound reads and contributions unlocked.' },
  2: { label: 'Tier 2 — Verified', blurb: 'p31.identity credential in the Phenix wallet. Operator-gated capital actions unlocked.' },
};

/**
 * Step up from Tier 1 → Tier 2: ensure a vault exists, then store a
 * self-attested `p31.identity` credential bound to the connected DID.
 * Returns the stored credential, or null if no identity is connected.
 */
export async function stepUpToTier2(password: string): Promise<WalletCredential | null> {
  const identity = loadIdentity();
  if (!identity) return null;
  const wallet = PHENIX_WALLET.status();
  if (!wallet.exists) {
    await PHENIX_WALLET.createVault(password);
  } else if (!wallet.unlocked) {
    await PHENIX_WALLET.unlockVault(password);
  }
  return PHENIX_WALLET.storeCredential(IDENTITY_VCT, 'did:web:p31ca.org', {
    did: identity.did,
    tier: 2,
    attestedAt: new Date().toISOString(),
  });
}