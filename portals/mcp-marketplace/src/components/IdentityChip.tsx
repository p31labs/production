import { useWorkspaceStore } from '@/store/workspaceStore'
import { roster } from '@/lib/pickleNames'

/**
 * IdentityChip — the sovereign identity chip in the marketplace chrome.
 * Reuses the workspace's did:key + composite post-quantum identity machinery:
 * the first time it's activated it mints a real did:key (Ed25519 base58btc)
 * bound to hybrid ML-DSA-65 key material, held wrapped in IndexedDB.
 */
export function IdentityChip() {
  const activeMemberId = useWorkspaceStore((s) => s.activeMemberId)
  const identities = useWorkspaceStore((s) => s.identities)
  const claimIdentity = useWorkspaceStore((s) => s.claimIdentity)

  const member = roster().find((m) => m.id === activeMemberId) ?? roster()[0]!
  const identity = identities[member.id]

  const shortDid = identity?.did
    ? identity.did.length > 26
      ? `${identity.did.slice(0, 13)}…${identity.did.slice(-9)}`
      : identity.did
    : null

  const activate = () => {
    if (identity) return
    void claimIdentity(member.id, member.emoji, 'cyan')
  }

  return (
    <button
      type="button"
      className="identity-chip"
      onClick={activate}
      aria-label={identity ? `Identity ${identity.did}` : 'Mint sovereign identity'}
      title={identity ? identity.did : 'Mint did:key (Ed25519 + ML-DSA-65)'}
    >
      <span aria-hidden="true">{member.emoji}</span>
      <span className="identity-chip__did" style={{ fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }}>
        {shortDid ?? 'claim did:key'}
      </span>
      <span
        className="identity-chip__dot"
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: 'var(--p31-radius-full)',
          background: identity?.verified ? 'var(--p31-accent-green)' : identity ? 'var(--p31-accent-gold)' : 'var(--p31-text-muted)',
          boxShadow: identity?.verified ? '0 0 6px var(--p31-accent-green)' : 'none',
        }}
      />
    </button>
  )
}