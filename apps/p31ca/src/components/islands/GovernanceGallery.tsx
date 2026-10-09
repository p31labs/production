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
    <div className="space-y-4">
      {/* ChainTimeline */}
      <div className="rounded-xl border p-4" style={{ borderColor: 'var(--p31-glass-border)', background: 'var(--p31-surface)' }}>
        <div className="text-xs font-mono uppercase tracking-wider mb-3" style={{ color: 'var(--p31-text-tertiary)' }}>ChainTimeline</div>
        <div className="space-y-1.5">
          {EVENTS.map((e) => (
            <div key={e.seq} className="flex items-center gap-2 text-sm rounded px-2 py-1" style={{ background: 'var(--p31-surface2)' }}>
              <span className="font-mono text-xs" style={{ color: 'var(--p31-text-tertiary)' }}>#{e.seq}</span>
              <span className="text-xs" style={{ color: e.actor === 'agent' ? 'var(--p31-chain-pending, #d97757)' : 'var(--p31-text)' }}>{e.actor}</span>
              <span style={{ color: 'var(--p31-text)' }}>{e.action}</span>
              <span className="ml-auto font-mono text-xs" style={{ color: 'var(--p31-text-tertiary)' }}>{e.ts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* VerifyButton */}
      <div className="rounded-xl border p-4" style={{ borderColor: 'var(--p31-glass-border)', background: 'var(--p31-surface)' }}>
        <div className="text-xs font-mono uppercase tracking-wider mb-3" style={{ color: 'var(--p31-text-tertiary)' }}>VerifyButton</div>
        <button onClick={() => setVerified(true)} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: 'var(--p31-accent)', color: 'var(--p31-bg, #141413)' }}>
          Verify chain
        </button>
        {verified && <div className="mt-3 text-sm" style={{ color: 'var(--p31-chain-verified, #788c5d)' }}>Chain intact across 5 events. Head a1b2c3d4…</div>}
      </div>

      {/* LumiIdentityCard */}
      <div className="rounded-xl border p-4" style={{ borderColor: 'var(--p31-glass-border)', background: 'var(--p31-surface)' }}>
        <div className="text-xs font-mono uppercase tracking-wider mb-3" style={{ color: 'var(--p31-text-tertiary)' }}>LumiIdentityCard</div>
        <div className="font-mono text-xs" style={{ color: 'var(--p31-text-secondary)' }}>did:key:z6Mk…lumi</div>
        <div className="text-xs mt-1" style={{ color: 'var(--p31-chain-verified, #788c5d)' }}>ML-DSA-65 ✓ · expires in 14:58</div>
      </div>
    </div>
  )
}