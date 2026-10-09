import { useState } from 'react'

/**
 * ModeGateDemo — the transducer for QPJ's progressive disclosure.
 * Spark → maker → workshop. Enter the caregiver PIN and watch the workshop
 * unlock. Progressive disclosure felt: the same data, gated by mode.
 */
const PIN = '1234'

const SURFACES = {
  spark: ['Street', 'Talk', 'You', 'Site', 'Worker', 'Song'],
  maker: ['Street', 'Talk', 'You', 'Site', 'Worker', 'Song', 'Craft', 'Docs', 'Sheets', 'Slides'],
  workshop: ['Street', 'Talk', 'You', 'Site', 'Worker', 'Song', 'Craft', 'Docs', 'Sheets', 'Slides', 'Tokens', 'Recipes', 'Components', 'Studio'],
}

export default function ModeGateDemo() {
  const [mode, setMode] = useState<'spark' | 'maker' | 'workshop'>('spark')
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  const tryUnlock = () => {
    if (pin === PIN) {
      setMode('workshop')
      setError(false)
      setPin('')
    } else {
      setError(true)
    }
  }

  const surfaces = SURFACES[mode]

  return (
    <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--p31-glass-border)', background: 'var(--p31-surface)' }}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg font-semibold" style={{ color: 'var(--p31-text)' }}>🫙 Quantum Pickle Jar · modes</span>
        <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in oklab, var(--p31-accent) 15%, transparent)', color: 'var(--p31-accent)' }}>{mode}</span>
      </div>

      {/* Mode switcher */}
      <div className="flex gap-2 mb-4">
        {(['spark', 'maker', 'workshop'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m === 'workshop' ? 'spark' : m)} // workshop only via PIN
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: mode === m ? 'var(--p31-accent)' : 'transparent', color: mode === m ? 'var(--p31-bg, #141413)' : 'var(--p31-text)', border: '1px solid var(--p31-glass-border)' }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Surface list — what each mode reveals */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {surfaces.map((s) => (
          <span key={s} className="px-2 py-1 rounded text-xs border" style={{ borderColor: 'var(--p31-glass-border)', color: 'var(--p31-text-secondary)', background: 'var(--p31-surface2)' }}>{s}</span>
        ))}
      </div>

      {/* PIN gate */}
      {mode !== 'workshop' && (
        <div className="flex gap-2 items-center">
          <input
            type="password"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(false) }}
            placeholder="Caregiver PIN (try 1234)"
            className="flex-1 px-3 py-1.5 rounded-lg text-xs border"
            style={{ borderColor: error ? 'var(--p31-chain-broken, #c0392b)' : 'var(--p31-glass-border)', color: 'var(--p31-text)', background: 'var(--p31-surface2)' }}
          />
          <button onClick={tryUnlock} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'var(--p31-accent)', color: 'var(--p31-bg, #141413)' }}>
            Unlock workshop
          </button>
        </div>
      )}
      {error && <div className="mt-2 text-xs" style={{ color: 'var(--p31-chain-broken, #c0392b)' }}>Wrong PIN — the workshop stays locked.</div>}

      <p className="mt-4 text-xs" style={{ color: 'var(--p31-text-tertiary)' }}>
        Progressive disclosure is a security posture: a child's spark mode never reaches the caregiver workshop without a PIN. Per-person isolation, never persisted.
      </p>
    </div>
  )
}