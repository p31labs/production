import { CalmOverlay as CanonCalmOverlay } from '@p31ca/design-core/compositions'
import { useWorkspaceStore } from '@/store/workspaceStore'

/**
 * CalmOverlay — canon wrapper (consume-don't-fork).
 *
 * The canon component is store-agnostic: `spoons === 0` activates the
 * two-phase calm timeline and drives `data-calm` / `data-calm-phase` on
 * <html>; `onExit` ends the session. This wrapper maps the workspace store's
 * calm flag (crisis ⇔ spoons 0) onto that contract and owns nothing visual.
 */
export function CalmOverlay() {
  const crisis = useWorkspaceStore((s) => s.crisis)
  const spoons = useWorkspaceStore((s) => s.spoons)
  const setCalm = useWorkspaceStore((s) => s.setCalm)

  return <CanonCalmOverlay spoons={crisis ? 0 : spoons} onExit={() => setCalm(false)} />
}

export default CalmOverlay