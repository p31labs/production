import { Starfield as CanonStarfield } from '@p31ca/design-core/compositions'
import { useWorkspaceStore } from '@/store/workspaceStore'
import './starfield.css'

/**
 * Starfield — canon wrapper (consume-don't-fork).
 *
 * The canon mounts the seeded canvas (design-core/starfield) and derives its
 * particle config from spoons / voltage / safeMode; this wrapper feeds the
 * workspace store (calm ⇔ safeMode ⇔ spoons 0) and keeps only the
 * geometry-only positioning class (starfield.css).
 */
export function Starfield() {
  const spoons = useWorkspaceStore((s) => s.spoons)
  const crisis = useWorkspaceStore((s) => s.crisis)

  return <CanonStarfield spoons={crisis ? 0 : spoons} safeMode={crisis} className="starfield" />
}

export default Starfield