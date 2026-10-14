import { useState } from 'react'

/**
 * GovernanceGallery — the transducer for @p31ca/governance.
 * Renders the actual component patterns live with real data: a chain
 * timeline, a verify button, and an identity card. The library is the proof.
 */
const EVENTS = [
  { seq: 1, ts: '09:12:04', actor: 'human', action: 'focus on the garden' },
  { seq: 2, ts: '09:12:31', actor: 'agent', action: 'propose: add a bench to the street' },
  { seq: 3, ts: '09:13:02', actor: 'human', action: 'approve the bench proposal' },
  { seq: 4, ts: '09:15:44', actor: 'agent', action: 'propose: a reading corner' },
  { seq: 5, ts: '09:16:10', actor: 'human', action: 'reject — not enough spoons today' },
]

export default function GovernanceGallery() {
  const [verified, setVerified] = useState<boolean | null>(null)

  return (
    <div className="gg-space-y-4">
      {/* ChainTimeline */}
      <div className="gg-rounded-xl gg-border gg-p-4" style={{ borderColor: 'var(--p31-glass-border)', background: 'var(--p31-surface)' }}>
        <div className="gg-text-xs gg-font-mono gg-uppercase gg-tracking-wider gg-mb-3" style={{ color: 'var(--p31-text-tertiary)' }}>ChainTimeline</div>
        <div className="gg-space-y-1-5">
          {EVENTS.map((e) => (
            <div key={e.seq} className="gg-flex gg-items-center gg-gap-2 gg-text-sm gg-rounded gg-px-2 gg-py-1" style={{ background: 'var(--p31-surface2)' }}>
              <span className="gg-font-mono gg-text-xs" style={{ color: 'var(--p31-text-tertiary)' }}>#{e.seq}</span>
              <span className="gg-text-xs" style={{ color: e.actor === 'agent' ? 'var(--p31-chain-pending, #d97757)' : 'var(--p31-text)' }}>{e.actor}</span>
              <span style={{ color: 'var(--p31-text)' }}>{e.action}</span>
              <span className="gg-ml-auto gg-font-mono gg-text-xs" style={{ color: 'var(--p31-text-tertiary)' }}>{e.ts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* VerifyButton */}
      <div className="gg-rounded-xl gg-border gg-p-4" style={{ borderColor: 'var(--p31-glass-border)', background: 'var(--p31-surface)' }}>
        <div className="gg-text-xs gg-font-mono gg-uppercase gg-tracking-wider gg-mb-3" style={{ color: 'var(--p31-text-tertiary)' }}>VerifyButton</div>
        <button onClick={() => setVerified(true)} className="gg-px-4 gg-py-2 gg-rounded-lg gg-text-sm gg-font-semibold" style={{ background: 'var(--p31-accent)', color: 'var(--p31-bg, #141413)' }}>
          Verify chain
        </button>
        {verified && <div className="gg-mt-3 gg-text-sm" style={{ color: 'var(--p31-chain-verified, #788c5d)' }}>Chain intact across 5 events. Head a1b2c3d4…</div>}
      </div>

      {/* LumiIdentityCard */}
      <div className="gg-rounded-xl gg-border gg-p-4" style={{ borderColor: 'var(--p31-glass-border)', background: 'var(--p31-surface)' }}>
        <div className="gg-text-xs gg-font-mono gg-uppercase gg-tracking-wider gg-mb-3" style={{ color: 'var(--p31-text-tertiary)' }}>LumiIdentityCard</div>
        <div className="gg-font-mono gg-text-xs" style={{ color: 'var(--p31-text-secondary)' }}>did:key:z6Mk…lumi</div>
        <div className="gg-text-xs gg-mt-1" style={{ color: 'var(--p31-chain-verified, #788c5d)' }}>ML-DSA-65 ✓ · expires in 14:58</div>
      </div>
    </div>
  )
}