import { useEffect, useState } from 'react'

/**
 * LumiTokenVisualizer — the transducer for post-quantum capability tokens.
 *
 * Lumi's identity is invisible: a did:key, a composite Ed25519 + ML-DSA-65
 * signature, a 15-minute expiry. This makes it felt:
 *   - the countdown ticks (the token expires)
 *   - the scope checklist shows exactly what Lumi may / may not do
 *   - the signature badge verifies live
 *   - "renew" restarts the 15-minute window
 */
export default function LumiTokenVisualizer() {
  const [secondsLeft, setSecondsLeft] = useState(900)
  const [renewed, setRenewed] = useState(0)
  const [verified, setVerified] = useState(true)

  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [])

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')
  const low = secondsLeft < 120

  return (
    <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--p31-glass-border)', background: 'var(--p31-surface)' }}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg font-semibold" style={{ color: 'var(--p31-text)' }}>🔮 Lumi · capability token</span>
        <span
          className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full"
          style={{
            background: verified ? 'color-mix(in oklab, var(--p31-chain-verified, #788c5d) 15%, transparent)' : 'color-mix(in oklab, var(--p31-chain-broken, #c0392b) 15%, transparent)',
            color: verified ? 'var(--p31-chain-verified, #788c5d)' : 'var(--p31-chain-broken, #c0392b)',
          }}
        >
          {verified ? 'ML-DSA-65 ✓' : 'Unverified'}
        </span>
      </div>

      {/* Expiry countdown */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span style={{ color: 'var(--p31-text-tertiary)' }}>Expires in</span>
          <span className="font-mono" style={{ color: low ? 'var(--p31-chain-pending, #d97757)' : 'var(--p31-text)' }}>{mm}:{ss}</span>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: 'var(--p31-glass-border)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${(secondsLeft / 900) * 100}%`, background: low ? 'var(--p31-chain-pending, #d97757)' : 'var(--p31-chain-verified, #788c5d)' }}
          />
        </div>
      </div>

      {/* Scope checklist — the co-presence contract, made literal */}
      <div className="space-y-1.5 text-sm mb-4">
        <div className="flex items-center gap-2"><span style={{ color: 'var(--p31-chain-verified, #788c5d)' }}>✓</span><span style={{ color: 'var(--p31-text)' }}>propose changes</span></div>
        <div className="flex items-center gap-2"><span style={{ color: 'var(--p31-chain-verified, #788c5d)' }}>✓</span><span style={{ color: 'var(--p31-text)' }}>review proposals</span></div>
        <div className="flex items-center gap-2 opacity-50"><span style={{ color: 'var(--p31-text-tertiary)' }}>—</span><span style={{ color: 'var(--p31-text-secondary)' }}>approve (human only)</span></div>
        <div className="flex items-center gap-2 opacity-50"><span style={{ color: 'var(--p31-text-tertiary)' }}>—</span><span style={{ color: 'var(--p31-text-secondary)' }}>reject (human only)</span></div>
        <div className="flex items-center gap-2 opacity-50"><span style={{ color: 'var(--p31-text-tertiary)' }}>—</span><span style={{ color: 'var(--p31-text-secondary)' }}>act autonomously</span></div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => { setSecondsLeft(900); setRenewed((r) => r + 1) }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'var(--p31-accent)', color: 'var(--p31-bg, #141413)' }}
        >
          Renew token
        </button>
        <button
          onClick={() => setVerified((v) => !v)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
          style={{ borderColor: 'var(--p31-glass-border)', color: 'var(--p31-text)' }}
        >
          {verified ? 'Simulate tamper' : 'Re-verify'}
        </button>
      </div>

      <p className="mt-4 text-xs" style={{ color: 'var(--p31-text-tertiary)' }}>
        The real token is a composite Ed25519 + ML-DSA-65 signature, 15-minute expiry, verified fail-closed at the Loom gate.{renewed > 0 && ` Renewed ${renewed}×.`}
      </p>
    </div>
  )
}