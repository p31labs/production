import { useMarketplaceStore } from '@/store/marketplaceStore'
import { callTool } from '@/lib/registryClient'
import { toMarkdown, downloadText } from '@/lib/sessionLog'
import { RiskChip } from '@/features/marketplace/components'

/**
 * SessionPanel — the per-session history of tool invocations with re-run,
 * export (JSON/Markdown), and clear.
 */
export function SessionPanel() {
  const session = useMarketplaceStore((s) => s.session)
  const clearSession = useMarketplaceStore((s) => s.clearSession)
  const updateSession = useMarketplaceStore((s) => s.updateSession)
  const loadServer = useMarketplaceStore((s) => s.loadServer)

  const rerun = (id: string) => {
    const ev = session.find((e) => e.id === id)
    if (!ev) return
    updateSession(id, { status: 'running', error: undefined, result: undefined })
    void (async () => {
      try {
        await loadServer(ev.serverId)
        const start = performance.now()
        const { text } = await callTool(ev.serverId, ev.tool, ev.args)
        let parsed: unknown = text
        try {
          parsed = JSON.parse(text)
        } catch {
          /* keep raw text */
        }
        updateSession(id, { status: 'done', result: parsed, latencyMs: Math.round(performance.now() - start) })
      } catch (e: unknown) {
        updateSession(id, { status: 'error', error: e instanceof Error ? e.message : String(e) })
      }
    })()
  }

  if (session.length === 0) {
    return (
      <div className="surface-panel">
        <div className="surface-card-title">Session</div>
        <div className="surface-card-desc">Run a tool to build your session history. Every call is recorded with args, status, latency, and result.</div>
      </div>
    )
  }

  return (
    <div className="surface-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-2)' }}>
        <div className="surface-card-title">Session</div>
        <span className="chip" style={{ color: 'var(--p31-text-muted)' }}>{session.length} calls</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--p31-space-2)' }}>
          <button type="button" className="btn-sm" onClick={() => downloadText('p31-mcp-session.md', toMarkdown(session))}>export .md</button>
          <button type="button" className="btn-sm" onClick={() => downloadText('p31-mcp-session.json', JSON.stringify(session, null, 2))}>export .json</button>
          <button type="button" className="btn-sm" onClick={clearSession}>clear</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-2)', marginTop: 'var(--p31-space-3)' }}>
        {session.map((e) => (
          <div key={e.id} className="surface-card" style={{ padding: 'var(--p31-space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-2)', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--p31-accent)' }}>{e.serverName}</span>
              <span className="chip" style={{ fontFamily: 'var(--p31-font-mono)', color: 'var(--p31-text-primary)' }}>{e.tool}</span>
              <RiskChip risk={e.risk} />
              <span className="chip" style={{ color: e.status === 'error' ? 'var(--p31-accent-red)' : e.status === 'done' ? 'var(--p31-accent-green)' : 'var(--p31-accent-gold)' }}>{e.status}</span>
              {e.latencyMs !== undefined && <span className="chip" style={{ color: 'var(--p31-text-muted)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }}>{e.latencyMs}ms</span>}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--p31-space-2)' }}>
                <button type="button" className="btn-sm" onClick={() => rerun(e.id)} disabled={e.status === 'running'}>re-run</button>
              </div>
            </div>
            {e.error && <div className="setup-err" style={{ marginTop: 'var(--p31-space-2)' }}>{e.error}</div>}
            {e.result !== undefined && !e.error && (
              <pre style={{ marginTop: 'var(--p31-space-2)', maxHeight: 120, overflow: 'auto', background: 'var(--p31-surface2)', borderRadius: 'var(--p31-radius-sm)', padding: 'var(--p31-space-2)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)', color: 'var(--p31-text-secondary)' }}>
                {typeof e.result === 'string' ? e.result : JSON.stringify(e.result, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}