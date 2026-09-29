import { useUI } from '../lib/store'

/** Calm overlay — the spoon 0 floor. CrisisOverlay equivalent for this portal. */
export function CalmOverlay() {
  const { spoons } = useUI()
  const visible = spoons <= 0
  return (
    <div className={`calm-overlay ${visible ? 'is-visible' : ''}`} aria-hidden={!visible}>
      <div className="calm-overlay__card glass">
        <h1>Taking a pause</h1>
        <p>
          Spoons are at 0. The interface has gone quiet — no motion, no glow,
          just the essentials. Nothing needs your attention right now.
        </p>
        <button className="btn btn--primary" onClick={() => useUI.getState().setSpoons(1)}>
          I'm ready
        </button>
      </div>
    </div>
  )
}