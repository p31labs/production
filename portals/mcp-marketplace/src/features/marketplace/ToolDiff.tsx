import type { ToolDef } from '@/types'

/**
 * ToolDiff — D2: diff the current tool surface against the last-reviewed
 * baseline. Added tools green, removed tools red, changed descriptions amber.
 */
export function ToolDiff({ current, baseline }: { current: ToolDef[]; baseline: Array<{ name: string; description: string }> }) {
  const base = new Map(baseline.map((b) => [b.name, b.description ?? '']))
  const cur = new Map(current.map((t) => [t.name, t.description ?? '']))
  const all = new Set([...base.keys(), ...cur.keys()])
  const rows = [...all].sort()

  return (
    <div className="surface-panel" style={{ marginTop: 'var(--p31-space-2)' }}>
      {rows.map((name) => {
        const b = base.get(name)
        const c = cur.get(name)
        const added = b === undefined
        const removed = c === undefined
        const changed = !added && !removed && b !== c
        if (added || removed || changed) {
          return (
            <div key={name} style={{ padding: 'var(--p31-space-2) 0', borderBottom: '1px solid var(--p31-glass-border)' }}>
              <div style={{ color: added ? 'var(--p31-accent-green)' : removed ? 'var(--p31-accent-red)' : 'var(--p31-accent-gold)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }}>
                {added ? '+ ' : removed ? '− ' : '~ '}{name}
              </div>
              {removed && <div style={{ color: 'var(--p31-text-muted)', fontSize: 'var(--p31-text-xs)' }}>{b}</div>}
              {added && <div style={{ color: 'var(--p31-text-secondary)', fontSize: 'var(--p31-text-xs)' }}>{c}</div>}
              {changed && (
                <>
                  <div style={{ color: 'var(--p31-text-muted)', fontSize: 'var(--p31-text-xs)', textDecoration: 'line-through' }}>{b}</div>
                  <div style={{ color: 'var(--p31-accent-gold)', fontSize: 'var(--p31-text-xs)' }}>{c}</div>
                </>
              )}
            </div>
          )
        }
        return null
      })}
      {rows.filter((n) => base.get(n) === cur.get(n) && base.get(n) !== undefined).length === 0 && !current.length && <div className="surface-card-desc">No tools exposed.</div>}
    </div>
  )
}