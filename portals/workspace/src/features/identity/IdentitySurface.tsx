import { useEffect, useState } from 'react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useNotifStore } from '@/store/useNotifStore'
import { useSBT } from '@/hooks/useSBT'
import { roster } from '@/lib/pickleNames'
import { resolveProfile } from '@/lib/profile'
import { shortDid, type Identity } from '@/lib/identity'
import { loadSbtChain, verifySbtChain, type SBT } from '@/lib/sbt'
import { getLoveBalance } from '@p31/sovereign-core'
import { MCP_TOOLS } from '@/lib/mcpTools'

/**
 * IdentitySurface — family passports (#/identity).
 *
 * Each roster member gets a real sovereign did:key (Ed25519), a soulbound
 * token chain (hash-chained, Loom-anchored best-effort), and a live love
 * balance from the love-ledger. "Claim your space" is the fun family-friendly
 * onboarding that mints the member's first DID.
 */
export function IdentitySurface() {
  const identities = useWorkspaceStore((s) => s.identities)
  const activeMemberId = useWorkspaceStore((s) => s.activeMemberId)
  const profiles = useWorkspaceStore((s) => s.profiles)
  const claimIdentity = useWorkspaceStore((s) => s.claimIdentity)
  const { chain } = useSBT()

  const [activeChain, setActiveChain] = useState<SBT[]>([])
  const [verified, setVerified] = useState<boolean | null>(null)
  const [love, setLove] = useState<number | null>(null)

  const active = identities[activeMemberId] ?? null

  useEffect(() => {
    if (!activeMemberId) return
    setActiveChain(loadSbtChain(activeMemberId))
    void verifySbtChain(activeMemberId).then(setVerified)
  }, [activeMemberId, identities, chain])

  // Live love balance (best-effort — the ledger is live).
  useEffect(() => {
    if (!active) {
      setLove(null)
      return
    }
    void getLoveBalance(active.did).then((b) => setLove(b?.availableBalance ?? 0))
  }, [active])

  const familyCount = roster().length

  return (
    <section className="surface-panel active" data-mcp-tool={MCP_TOOLS.identity} data-mcp-state="ready" aria-label="Family passports">
      <div className="home-container">
        <h1 className="greeting-h1">Family passports</h1>
        <p style={{ color: 'var(--p31-cloud)' }}>
          Every member has a sovereign did:key and a soulbound token chain — minted locally, anchored on-chain when we can.
        </p>

        <div className="identity-grid">
          {roster().map((m) => {
            const identity = identities[m.id] ?? null
            const profile = resolveProfile(m.id, m.emoji, profiles[m.id])
            return (
              <MemberPassport
                key={m.id}
                memberEmoji={m.emoji}
                identity={identity}
                active={m.id === activeMemberId}
                profile={profile}
                onClaim={() => claimIdentity(m.id, profile.emoji, profile.accent)}
              />
            )
          })}
        </div>

        <div className="passport-summary" style={{ marginTop: 16 }}>
          <p className="setup-mono">
            {Object.keys(identities).filter((id) => identities[id]).length}/{familyCount} members hold DIDs · chain{' '}
            {verified === null ? 'verifying…' : verified ? 'verified ✓' : 'broken ✗'} · {activeChain.length} tokens
            {active && love !== null ? ` · love ${love}` : ''}
          </p>
        </div>

        {active && (
          <>
            <h2 className="setup-title" style={{ marginTop: 28 }}>Soulbound tokens — {active.pickleName}</h2>
            <div className="sbt-gallery">
              {activeChain.length === 0 && (
                <p style={{ color: 'var(--p31-cloud)' }}>No tokens yet — the first one mints when you claim your space.</p>
              )}
              {activeChain.map((s) => (
                <SbtCard key={s.id} sbt={s} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function MemberPassport({
  memberEmoji,
  identity,
  active,
  profile,
  onClaim,
}: {
  memberEmoji: string
  identity: Identity | null
  active: boolean
  profile: ReturnType<typeof resolveProfile>
  onClaim: () => void
}) {
  const notify = useNotifStore((s) => s.notify)

  if (!identity) {
    return (
      <div className={`glass-panel identity-card${active ? ' active' : ''}`}>
        <div className="identity-card__head">
          <span className="identity-card__emoji">{memberEmoji}</span>
          <span className="identity-card__name">{profile.greetingName}</span>
        </div>
        <p style={{ color: 'var(--p31-cloud)', fontSize: 13 }}>No passport yet.</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={async () => {
            await onClaim()
            notify({ kind: 'milestone', title: 'Space claimed', body: `${profile.greetingName} has a sovereign DID.`, burst: true })
          }}
        >
          Claim your space
        </button>
      </div>
    )
  }

  return (
    <div className={`glass-panel identity-card${active ? ' active' : ''}`}>
      <div className="identity-card__head">
        <span className="identity-card__emoji">{identity.avatar}</span>
        <span className="identity-card__name">{identity.pickleName}</span>
      </div>
      <p className="setup-mono" style={{ marginTop: 6 }}>{shortDid(identity.did)}</p>
      <p style={{ color: 'var(--p31-cloud)', fontSize: 12 }}>
        Minted {new Date(identity.createdAt).toLocaleDateString()}
      </p>
    </div>
  )
}

function SbtCard({ sbt }: { sbt: SBT }) {
  const badge =
    sbt.anchorStatus === 'anchored' ? '⛓ anchored' :
    sbt.anchorStatus === 'pending' ? '⏳ pending' :
    '📁 local'
  return (
    <div className={`glass-panel sbt-card sbt-card--${sbt.kind}`}>
      <div className="sbt-card__kind">{sbt.kind}</div>
      <h3 className="sbt-card__title">{sbt.title}</h3>
      <p className="sbt-card__desc">{sbt.description}</p>
      <div className="sbt-card__foot">
        <span>{badge}</span>
        {sbt.onChainTokenId && <span className="setup-mono">#{sbt.onChainTokenId}</span>}
      </div>
    </div>
  )
}

export default IdentitySurface