import { useWorkspaceStore } from '@/store/workspaceStore'
import { useMarketplaceStore } from '@/store/marketplaceStore'
import { useThemeStore } from '@p31ca/design-core/theming/theme-store'
import type { SpoonLevel } from '@/types'

/**
 * SettingsSheet — plain-language controls (plan W2):
 *
 *   Energy right now: Low / Medium / High — maps to the spoon store.
 *     Low = crisis/calm styling (no dots jargon). Medium = 3, High = 5.
 *   Reduce motion: on/off — maps to ThemeCharm's calm behavior (muted).
 *   Admin view: on/off — the old LensSwitch; ONLY shown when the session is
 *     elevated (mode != spark) or the registry reports an elevated role.
 */
export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const spoons = useWorkspaceStore((s) => s.spoons)
  const crisis = useWorkspaceStore((s) => s.crisis)
  const setSpoons = useWorkspaceStore((s) => s.setSpoons)
  const setCalm = useWorkspaceStore((s) => s.setCalm)
  const mode = useWorkspaceStore((s) => s.mode)
  const lens = useMarketplaceStore((s) => s.lens)
  const setLens = useMarketplaceStore((s) => s.setLens)
  const me = useMarketplaceStore((s) => s.me)
  const muted = useThemeStore((s) => s.muted)
  const setMuted = useThemeStore((s) => s.setMuted)

  const energy: 'Low' | 'Medium' | 'High' = crisis ? 'Low' : spoons <= 2 ? 'Low' : spoons >= 4 ? 'High' : 'Medium'

  const setEnergy = (next: 'Low' | 'Medium' | 'High') => {
    if (next === 'Low') {
      setCalm(true)
    } else {
      setCalm(false)
      setSpoons((next === 'High' ? 5 : 3) as SpoonLevel)
    }
  }

  const elevated = mode !== 'spark' || me?.role === 'admin' || me?.role === 'reviewer'

  const energyButton = (label: 'Low' | 'Medium' | 'High') => (
    <button
      key={label}
      type="button"
      className="btn-sm"
      aria-pressed={energy === label}
      onClick={() => setEnergy(label)}
      style={energy === label
        ? { background: 'var(--p31-accent)', color: 'var(--p31-void)', fontWeight: 600, padding: '6px 14px', borderRadius: 'var(--p31-radius-md)' }
        : { padding: '6px 14px', borderRadius: 'var(--p31-radius-md)' }}
    >
      {label}
    </button>
  )

  const toggleButton = (label: string, on: boolean, onToggle: () => void) => (
    <button
      type="button"
      className="btn-sm"
      aria-pressed={on}
      onClick={onToggle}
      style={on
        ? { background: 'var(--p31-accent)', color: 'var(--p31-void)', fontWeight: 600, padding: '6px 14px', borderRadius: 'var(--p31-radius-md)' }
        : { padding: '6px 14px', borderRadius: 'var(--p31-radius-md)' }}
    >
      {label}
    </button>
  )

  return (
    <div className="settings-sheet glass-panel" role="dialog" aria-label="Settings panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-2)' }}>
        <span className="surface-card-title">Settings</span>
        <button type="button" className="btn-sm" onClick={onClose} aria-label="Close settings" style={{ marginLeft: 'auto' }}>✕</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-1)' }}>
        <span style={{ color: 'var(--p31-text-secondary)', fontSize: 'var(--p31-text-sm)' }}>Energy right now:</span>
        <div style={{ display: 'flex', gap: 'var(--p31-space-2)' }}>
          {energyButton('Low')}
          {energyButton('Medium')}
          {energyButton('High')}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--p31-space-2)' }}>
        <span style={{ color: 'var(--p31-text-secondary)', fontSize: 'var(--p31-text-sm)' }}>Reduce motion</span>
        <span style={{ display: 'flex', gap: 'var(--p31-space-2)' }}>
          {toggleButton('Off', !muted, () => setMuted(false))}
          {toggleButton('On', muted, () => setMuted(true))}
        </span>
      </div>

      {elevated && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--p31-space-2)' }}>
          <span style={{ color: 'var(--p31-text-secondary)', fontSize: 'var(--p31-text-sm)' }}>Admin view</span>
          <span style={{ display: 'flex', gap: 'var(--p31-space-2)' }}>
            {toggleButton('Off', lens !== 'governed', () => setLens('public'))}
            {toggleButton('On', lens === 'governed', () => setLens('governed'))}
          </span>
        </div>
      )}
    </div>
  )
}

export default SettingsSheet