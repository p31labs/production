import { CalmOverlay as CanonCalmOverlay, type CalmSession } from '@p31ca/design-core/compositions'
import { useUI } from '../lib/store'

const CALM_LOG_KEY = 'p31:calm-sessions'
const CALM_LOG_CAP = 50

/** Append a calm session to the local recovery log (oldest-capped). */
function recordCalmSession(session: CalmSession) {
  try {
    const existing = JSON.parse(localStorage.getItem(CALM_LOG_KEY) ?? '[]') as CalmSession[]
    const next = [...existing, session].slice(-CALM_LOG_CAP)
    localStorage.setItem(CALM_LOG_KEY, JSON.stringify(next))
  } catch {
    // Non-fatal — the calm surface itself never depends on the log.
  }
}

/**
 * CalmOverlay — the regulation instrument (CALM-MODE.md). The forge has no
 * ambient package (no dome/LED), so calm is the simplified form: the canon
 * controller drives data-calm (hiding chrome), and the breathing circle is the
 * guide. Esc or the spoon-restore exits — no button, no text, no decisions.
 * Sessions are appended to the local recovery log (recovery-time trend).
 */
export function CalmOverlay() {
  const spoons = useUI((s) => s.spoons)
  const calm = spoons <= 0
  return (
    <>
      <CanonCalmOverlay
        spoons={spoons}
        onExit={() => useUI.getState().setSpoons(1)}
        onSessionEnd={recordCalmSession}
      />
      {calm && (
        <div className="calm-guide calm-breathe" aria-hidden="true" />
      )}
    </>
  )
}

export default CalmOverlay