export interface IdentityChipProps {
  /** The member emoji (avatar). */
  emoji?: string;
  /** The full did:key. Absent = not yet claimed. */
  did?: string;
  /** Whether the identity is server-verified (green) vs pending (gold). */
  verified?: boolean;
  /** Claim action — mints the did (the portal owns the crypto/store). */
  onClaim?: () => void;
  /** Pre-claim label (default "claim did:key"). */
  claimLabel?: string;
  className?: string;
}

/**
 * IdentityChip — the sovereign-identity chip (did:key claim).
 *
 * This is an IDENTITY ASSERTION, not a sign-in transition: it renders an
 * already-identified or claimable P31 identity (Ed25519 + ML-DSA-65 hybrid
 * key, held wrapped). Store-agnostic — `did`/`verified`/`onClaim` are props;
 * the portal owns the did machinery (minting, IndexedDB, verification).
 * Promoted from the marketplace chrome.
 */
export function IdentityChip({
  emoji,
  did,
  verified,
  onClaim,
  claimLabel = 'claim did:key',
  className = '',
}: IdentityChipProps) {
  const shortDid = did && did.length > 26 ? `${did.slice(0, 13)}…${did.slice(-9)}` : did ?? null;
  const needsClaim = !did;

  return (
    <button
      type="button"
      className={`identity-chip ${className}`.trim()}
      onClick={needsClaim ? onClaim : undefined}
      aria-label={did ? `Identity ${did}` : 'Mint sovereign identity'}
      title={did ? did : claimLabel}
    >
      {emoji && <span aria-hidden="true">{emoji}</span>}
      <span className="identity-chip__did">
        {shortDid ?? claimLabel}
      </span>
      <span
        className="identity-chip__dot"
        aria-hidden="true"
        data-verified={verified ? 'true' : did ? 'pending' : 'unclaimed'}
      />
    </button>
  );
}

export default IdentityChip;