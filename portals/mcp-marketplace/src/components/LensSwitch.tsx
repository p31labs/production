import { useMarketplaceStore } from '@/store/marketplaceStore'
import { getPrincipal } from '@/lib/auth'

/**
 * LensSwitch — the dual-lens control (B-3), retained for the "Admin view"
 * mapping. It is no longer mounted in the topbar: the settings sheet owns
 * the Admin view toggle now (plan W2). Kept compiling for the lens store.
 */
export function LensSwitch() {
  const lens = useMarketplaceStore((s) => s.lens)
  const setLens = useMarketplaceStore((s) => s.setLens)
  const principal = getPrincipal()

  const pill = (id: 'public' | 'governed', label: string, locked: boolean) => (
    <button
      type="button"
      className="topbar-role"
      onClick={() => setLens(id)}
      aria-pressed={lens === id}
      title={locked ? 'Admin view needs a sign-in (coming soon)' : id === 'public' ? 'Everyone view' : 'Admin view'}
      style={{
        color: lens === id ? 'var(--p31-void)' : id === 'governed' && locked ? 'var(--p31-text-muted)' : 'var(--p31-accent-violet)',
        background: lens === id ? 'var(--p31-accent)' : 'var(--p31-glass-bg)',
        borderColor: lens === id ? 'var(--p31-accent)' : `color-mix(in oklab, var(--p31-accent-violet) 40%, transparent)`,
        fontWeight: lens === id ? 700 : 500,
      }}
    >
      {label}{locked && !principal ? ' 🔒' : ''}
    </button>
  )

  return (
    <span style={{ display: 'inline-flex', gap: 'var(--p31-space-1)', alignItems: 'center' }}>
      {pill('public', 'Everyone', false)}
      {pill('governed', 'Admin', true)}
    </span>
  )
}

export default LensSwitch