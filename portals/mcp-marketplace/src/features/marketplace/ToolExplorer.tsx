import type { ToolDef } from '@/types'

/**
 * ToolExplorer — the storefront tool list (plan W3). Every row is a plain
 * description plus ONE "Try it" button that opens the playground pre-loaded
 * with that tool.
 */
export function ToolExplorer({ tools, onOpenTool }: { tools: ToolDef[]; onOpenTool: (tool: string) => void }) {
  if (tools.length === 0) {
    return <div className="landing-sub">This server has no tools yet.</div>
  }

  return (
    <div className="surface-panel" style={{ padding: 0, overflow: 'hidden', flexDirection: 'column' }}>
      <div role="table" aria-label="Tools" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <div role="row" style={{ display: 'flex', gap: 'var(--p31-space-3)', padding: 'var(--p31-space-2) var(--p31-space-3)', borderBottom: '1px solid var(--p31-glass-border)', color: 'var(--p31-text-muted)', fontSize: 'var(--p31-text-xs)' }}>
          <div style={{ flex: 1.2 }}>Tool</div>
          <div style={{ flex: 2.4 }}>What it does</div>
          <div style={{ flex: 0.6, textAlign: 'right' }}>Try</div>
        </div>
        {tools.map((t) => (
          <div
            key={t.name}
            role="row"
            style={{ display: 'flex', gap: 'var(--p31-space-3)', padding: 'var(--p31-space-2) var(--p31-space-3)', borderBottom: '1px solid var(--p31-glass-border)', alignItems: 'flex-start' }}
          >
            <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-1)' }}>
              <span className="marketplace-mono" style={{ textAlign: 'left', color: 'var(--p31-accent)' }}>
                {t.name}
              </span>
            </div>
            <div style={{ flex: 2.4, color: 'var(--p31-text-secondary)', fontSize: 'var(--p31-text-sm)' }}>{t.description ?? '—'}</div>
            <div style={{ flex: 0.6, textAlign: 'right' }}>
              <button
                type="button"
                className="btn-sm"
                onClick={() => onOpenTool(t.name)}
                style={{ background: 'var(--p31-accent)', color: 'var(--p31-void)', fontWeight: 600, padding: '6px 16px', borderRadius: 'var(--p31-radius-md)' }}
              >
                Try it
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}