import { useState } from 'react'
import { Input } from '@p31ca/design-core/canon-v2'
import { useMarketplaceStore } from '@/store/marketplaceStore'
import { callTool } from '@/lib/registryClient'
import { humanError } from '@/lib/humanErrors'
import { toMarkdown, downloadText } from '@/lib/sessionLog'
import { buildSnapshot, exportSnapshot, parseSnapshot } from '@/lib/snapshot'
import { RiskChip } from '@/features/marketplace/components'

/** Calls shown at once — the cognitive-load gate caps card lists at 7. */
const SHOWN = 7

/**
 * SessionPanel — your session history with re-run, save, open, and clear.
 * Each entry keeps its exact request/response behind "Show technical
 * details". The list pages in sevens.
 */
export function SessionPanel() {
  const session = useMarketplaceStore((s) => s.session)
  const clearSession = useMarketplaceStore((s) => s.clearSession)
  const updateSession = useMarketplaceStore((s) => s.updateSession)
  const loadServer = useMarketplaceStore((s) => s.loadServer)
  const restoreSnapshot = useMarketplaceStore((s) => s.restoreSnapshot)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [shown, setShown] = useState(SHOWN)

  const rerun = (id: string) => {
    const ev = session.find((e) => e.id === id)
    if (!ev) return
    updateSession(id, { status: 'running', error: undefined, result: undefined })
    void (async () => {
      try {
        await loadServer(ev.serverId)
        const start = performance.now()
        const { text, requestBody, responseBody } = await callTool(ev.serverId, ev.tool, ev.args)
        let parsed: unknown = text
        try {
          parsed = JSON.parse(text)
        } catch {
          /* keep raw text */
        }
        updateSession(id, { status: 'done', result: parsed, latencyMs: Math.round(performance.now() - start), request: requestBody, response: responseBody })
      } catch (e: unknown) {
        updateSession(id, { status: 'error', error: humanError(e instanceof Error ? e.message : String(e)) })
      }
    })()
  }

  const onImportFile = async (file: File | undefined) => {
    setImportMsg(null)
    if (!file) return
    try {
      const text = await file.text()
      const { snapshot, error } = parseSnapshot(text)
      if (error || !snapshot) {
        setImportMsg(`That file could not be read. ${error ?? 'It was empty.'}`)
        return
      }
      restoreSnapshot(snapshot)
      setImportMsg(`Opened ${file.name} with ${snapshot.session.length} saved call${snapshot.session.length === 1 ? '' : 's'}.`)
      window.location.hash = '#/playground'
    } catch (e: unknown) {
      setImportMsg(`That file could not be read. ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const onExportSnapshot = () => {
    const state = useMarketplaceStore.getState()
    exportSnapshot(buildSnapshot(
      {
        serverId: state.selectedServerId,
        serverName: state.serverDetail?.name,
        tool: state.selectedTool,
        args: session[0]?.args,
        result: session[0]?.result,
        error: session[0]?.error,
      },
      session,
    ))
  }

  const remaining = session.length - shown

  return (
    <div className="surface-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-2)', flexWrap: 'wrap' }}>
        <div className="surface-card-title">Your session</div>
        <span className="chip" style={{ color: 'var(--p31-text-muted)' }}>{session.length} calls</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--p31-space-2)', flexWrap: 'wrap' }}>
          <button type="button" className="btn-sm" onClick={() => downloadText('p31-mcp-session.md', toMarkdown(session))}>Save as text</button>
          <button type="button" className="btn-sm" onClick={() => downloadText('p31-mcp-session.json', JSON.stringify(session, null, 2))}>Save as JSON</button>
          <button type="button" className="btn-sm" onClick={onExportSnapshot} disabled={session.length === 0}>Save this session</button>
          <Input
            type="file"
            accept="application/json,.json"
            label="Open a saved session file"
            onChange={(e) => void onImportFile(e.target.files?.[0])}
          />
          <button type="button" className="btn-sm" onClick={clearSession}>Clear</button>
        </div>
      </div>

      {importMsg && <div className={importMsg.startsWith('Opened') ? 'landing-sub' : 'setup-err'} style={{ marginTop: 'var(--p31-space-2)' }}>{importMsg}</div>}

      {session.length === 0 && (
        <div className="surface-card-desc" style={{ marginTop: 'var(--p31-space-2)' }}>
          Run a tool to start your session. We save each call, the inputs, and the answer.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-2)', marginTop: 'var(--p31-space-3)' }}>
        {session.slice(0, shown).map((e) => (
          <div key={e.id} className="surface-card" style={{ padding: 'var(--p31-space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-2)', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--p31-accent)' }}>{e.serverName}</span>
              <span className="chip" style={{ fontFamily: 'var(--p31-font-mono)', color: 'var(--p31-text-primary)' }}>{e.tool}</span>
              <RiskChip risk={e.risk} />
              <span className="chip" style={{ color: e.status === 'error' ? 'var(--p31-accent-red)' : e.status === 'done' ? 'var(--p31-accent-green)' : 'var(--p31-accent-gold)' }}>{e.status === 'error' ? 'failed' : e.status === 'done' ? 'done' : 'running'}</span>
              {e.latencyMs !== undefined && <span className="chip" style={{ color: 'var(--p31-text-muted)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }}>{e.latencyMs}ms</span>}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--p31-space-2)' }}>
                <button type="button" className="btn-sm" onClick={() => rerun(e.id)} disabled={e.status === 'running'}>Run again</button>
              </div>
            </div>
            {e.error && <div className="setup-err" style={{ marginTop: 'var(--p31-space-2)' }}>{e.error}</div>}
            {e.result !== undefined && !e.error && (
              <pre style={{ marginTop: 'var(--p31-space-2)', maxHeight: 120, overflow: 'auto', background: 'var(--p31-surface2)', borderRadius: 'var(--p31-radius-sm)', padding: 'var(--p31-space-2)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)', color: 'var(--p31-text-secondary)' }}>
                {typeof e.result === 'string' ? e.result : JSON.stringify(e.result, null, 2)}
              </pre>
            )}
            {(e.request || e.response) && (
              <details style={{ marginTop: 'var(--p31-space-2)' }}>
                <summary style={{ color: 'var(--p31-text-muted)', fontSize: 'var(--p31-text-xs)', cursor: 'pointer' }}>Show technical details</summary>
                <pre style={{ marginTop: 'var(--p31-space-1)', background: 'var(--p31-surface2)', borderRadius: 'var(--p31-radius-sm)', padding: 'var(--p31-space-2)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)', color: 'var(--p31-text-secondary)', maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {'▶ sent\n'}{e.request ?? '—'}{'\n\n◀ answer\n'}{(e.response ?? '—').slice(0, 3000)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      {remaining > 0 && (
        <div style={{ textAlign: 'center', marginTop: 'var(--p31-space-3)' }}>
          <button type="button" className="btn-sm" onClick={() => setShown((v) => v + SHOWN)}>
            Show more ({remaining} left)
          </button>
        </div>
      )}
    </div>
  )
}