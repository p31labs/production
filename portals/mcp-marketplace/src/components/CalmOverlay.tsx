import { useWorkspaceStore } from '@/store/workspaceStore'

/**
 * CalmOverlay — shown when the family member sets the workspace to calm mode
 * (spoon level 0). No "crisis" language — calm, warm, safe. Motion pauses,
 * dense surfaces hide, and the breathing circle offers a rest stop.
 */
export function CalmOverlay() {
  const calm = useWorkspaceStore((s) => s.crisis)
  const setCalm = useWorkspaceStore((s) => s.setCalm)

  if (!calm) return null

  return (
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
  )
}

export default CalmOverlay