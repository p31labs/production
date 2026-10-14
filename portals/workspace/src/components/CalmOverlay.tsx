import { useCallback } from 'react'
import { CalmOverlay as CanonCalmOverlay } from '@p31ca/design-core/compositions'
import { useWorkspaceStore } from '@/store/workspaceStore'

/**
 * CalmOverlay — consumer wrapper over the canon CalmOverlay composition.
 *
 * The canon composition is a non-visual controller: it owns the calm state
 * machine (data-calm root attributes, sigh→coherence phasing, Escape handling,
 * session bookkeeping) and renders nothing. The portal keeps its own warm
 * rest-stop chrome underneath, shown while the workspace is in calm mode.
 */
export function CalmOverlay() {
  const calm = useWorkspaceStore((s) => s.crisis)
  const setCalm = useWorkspaceStore((s) => s.setCalm)
  const spoons = useWorkspaceStore((s) => s.spoons)
  const exitCalm = useCallback(() => setCalm(false), [setCalm])

  return (
    <>
      <CanonCalmOverlay spoons={spoons} onExit={exitCalm} />
      {calm && (
        <div className="calm-overlay active" role="dialog" aria-modal="true" aria-label="Calm mode">
          <div className="calm-circle" />
          <h1 style={{ fontSize: 36, fontWeight: 700, color: 'var(--p31-text-primary)', marginBottom: 8 }}>
            Take a breath.
          </h1>
          <p style={{ color: 'var(--p31-cloud)', maxWidth: 480, marginBottom: 32, fontSize: 18, textAlign: 'center' }}>
            Calm mode — everything has slowed down. You can rest here as long as you need.
          </p>
          <button className="btn btn-primary" type="button" style={{ padding: '12px 32px', fontSize: 18 }} onClick={() => setCalm(false)}>
            Return to the workspace
          </button>
        </div>
      )}
    </>
  )
}

export default CalmOverlay