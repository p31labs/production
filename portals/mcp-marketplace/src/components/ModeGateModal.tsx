import { useState } from 'react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { mintSessionCapability } from '@/lib/capabilityToken'

/**
 * Mode gate — the caregiver authorization pathway.
 *
 * Verifies the entered PIN against the stored caregiver PIN (not "any four
 * digits"). On success it elevates the session to `maker` and mints a
 * session PQC capability token (composite Ed25519 + ML-DSA-65) — the real
 * P31 authorization, fail-closed. The token is identity-bound: its `iss` is
 * the active member's real did:key when they hold a passport. Memory only.
 */
export function ModeGateModal() {
  const gateOpen = useWorkspaceStore((s) => s.gateOpen)
  const pendingSurface = useWorkspaceStore((s) => s.pendingSurface)
  const caregiverPin = useWorkspaceStore((s) => s.caregiverPin)
  const elevate = useWorkspaceStore((s) => s.elevate)
  const closeGate = useWorkspaceStore((s) => s.closeGate)
  const setSurface = useWorkspaceStore((s) => s.setSurface)
  const setSessionToken = useWorkspaceStore((s) => s.setSessionToken)
  const activeMemberId = useWorkspaceStore((s) => s.activeMemberId)
  const identities = useWorkspaceStore((s) => s.identities)

  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!gateOpen) return null

  function press(digit: string) {
    if (busy) return
    setError(null)
    const next = pin + digit
    if (next.length > 4) return
    setPin(next)
    if (next.length === 4) {
      void verify(next)
    }
  }

  async function verify(entered: string) {
    setBusy(true)
    if (entered !== caregiverPin) {
      setError('That PIN did not match. Try again, or open Setup to change it.')
      setPin('')
      setBusy(false)
      return
    }

    try {
      // Mint the session capability token under the ACTIVE member's real DID
      // (identity-bound) when a passport exists; else fall back to the slot.
      const identity = identities[activeMemberId]
      const issuer = identity?.did ?? `did:key:${activeMemberId}`
      const cap = await mintSessionCapability(issuer)
      setSessionToken(cap.token, cap.fingerprint)
    } catch (e) {
      // Token mint is best-effort for the session; elevation still proceeds.
      console.warn('[workspace] token mint failed:', e)
    }

    elevate('maker')
    closeGate()
    if (pendingSurface) setSurface(pendingSurface)
    setPin('')
    setBusy(false)
  }

  function clear() {
    setPin('')
    setError(null)
  }

  return (
    <div className="modal-backdrop active" role="dialog" aria-modal="true" aria-label="Mode gate">
      <div className="modal-box">
        <div style={{ textAlign: 'center' }}>
          <span className="badge badge-maker" style={{ marginBottom: 8 }}>CAREGIVER GATE</span>
          <h2 style={{ fontSize: 'var(--p31-text-h3)', marginTop: 4 }}>Enter the caregiver PIN</h2>
          <p style={{ fontSize: 'var(--p31-text-sm)', color: 'var(--p31-cloud)', marginTop: 4 }}>
            This surface is shared work. Open it with a caregiver in the room.
          </p>
        </div>

        <div className="pin-dots">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`pin-dot ${i <= pin.length ? 'filled' : ''}`} />
          ))}
        </div>

        {error && (
          <p style={{ color: 'var(--p31-accent-red)', fontSize: 'var(--p31-text-sm)', textAlign: 'center' }}>
            {error}
          </p>
        )}

        <div className="pin-grid">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} className="pin-btn" type="button" onClick={() => press(d)} disabled={busy}>{d}</button>
          ))}
          <button className="pin-btn" type="button" style={{ fontSize: 14 }} onClick={clear} disabled={busy}>Clear</button>
          <button className="pin-btn" type="button" onClick={() => press('0')} disabled={busy}>0</button>
          <button
            className="pin-btn"
            type="button"
            style={{ fontSize: 14, color: 'var(--p31-accent-red)' }}
            onClick={() => { clear(); closeGate() }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModeGateModal