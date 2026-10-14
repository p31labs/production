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
    <div className="mg-rounded-2xl mg-border mg-p-6" style={{ borderColor: 'var(--p31-glass-border)', background: 'var(--p31-surface)' }}>
      <div className="mg-flex mg-items-center mg-gap-2 mg-mb-4">
        <span className="mg-text-lg mg-font-semibold" style={{ color: 'var(--p31-text)' }}>🫙 Quantum Pickle Jar · modes</span>
        <span className="mg-ml-auto mg-text-xs mg-font-mono mg-px-2 mg-py-0-5 mg-rounded-full" style={{ background: 'color-mix(in oklab, var(--p31-accent) 15%, transparent)', color: 'var(--p31-accent)' }}>{mode}</span>
      </div>

      {/* Mode switcher */}
      <div className="mg-flex mg-gap-2 mg-mb-4">
        {(['spark', 'maker', 'workshop'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m === 'workshop' ? 'spark' : m)} // workshop only via PIN
            className="mg-px-3 mg-py-1-5 mg-rounded-lg mg-text-xs mg-font-semibold"
            style={{ background: mode === m ? 'var(--p31-accent)' : 'transparent', color: mode === m ? 'var(--p31-bg, #141413)' : 'var(--p31-text)', border: '1px solid var(--p31-glass-border)' }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Surface list — what each mode reveals */}
      <div className="mg-flex mg-flex-wrap mg-gap-1-5 mg-mb-4">
        {surfaces.map((s) => (
          <span key={s} className="mg-px-2 mg-py-1 mg-rounded mg-text-xs mg-border" style={{ borderColor: 'var(--p31-glass-border)', color: 'var(--p31-text-secondary)', background: 'var(--p31-surface2)' }}>{s}</span>
        ))}
      </div>

      {/* PIN gate */}
      {mode !== 'workshop' && (
        <div className="mg-flex mg-gap-2 mg-items-center">
          <input
            type="password"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(false) }}
            placeholder="Caregiver PIN (try 1234)"
            className="mg-flex-1 mg-px-3 mg-py-1-5 mg-rounded-lg mg-text-xs mg-border"
            style={{ borderColor: error ? 'var(--p31-chain-broken, #c0392b)' : 'var(--p31-glass-border)', color: 'var(--p31-text)', background: 'var(--p31-surface2)' }}
          />
          <button onClick={tryUnlock} className="mg-px-3 mg-py-1-5 mg-rounded-lg mg-text-xs mg-font-semibold" style={{ background: 'var(--p31-accent)', color: 'var(--p31-bg, #141413)' }}>
            Unlock workshop
          </button>
        </div>
      )}
      {error && <div className="mg-mt-2 mg-text-xs" style={{ color: 'var(--p31-chain-broken, #c0392b)' }}>Wrong PIN — the workshop stays locked.</div>}

      <p className="mg-mt-4 mg-text-xs" style={{ color: 'var(--p31-text-tertiary)' }}>
        Progressive disclosure is a security posture: a child's spark mode never reaches the caregiver workshop without a PIN. Per-person isolation, never persisted.
      </p>
    </div>
  )
}