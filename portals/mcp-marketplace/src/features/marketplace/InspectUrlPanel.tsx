import { useState } from 'react'
import { Input } from '@p31ca/design-core/canon-v2'
import { useMarketplaceStore, EXTERNAL_SERVER_ID } from '@/store/marketplaceStore'
import { listServers } from '@/lib/registryClient'
import { probeExternalServer } from '@/lib/mcpWire'
import type { ExternalProbeResult } from '@/types'
import { ToolExplorer } from './ToolExplorer'

/**
 * InspectUrlPanel — "Try a server" (plan W3, was: Inspect any URL).
 * Paste a server address → we check it live and show its tools.
 * A server that does not answer degrades to a friendly note — never a crash.
 */
export function InspectUrlPanel() {
  const externalProbe = useMarketplaceStore((s) => s.externalProbe)
  const setExternalProbe = useMarketplaceStore((s) => s.setExternalProbe)
  const selectTool = useMarketplaceStore((s) => s.selectTool)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inspect = async () => {
    const target = url.trim()
    if (!target) {
      setError('Type a server address first.')
      return
    }
    if (!/^https?:\/\//i.test(target)) {
      setError('The address must start with http:// or https://.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      // If we already know this address, open its page instead of checking again.
      const known = await listServers({}).then((servers) => servers.find((s) => normalizeUrl(s.endpoint) === normalizeUrl(target)))
      if (known) {
        setExternalProbe(null)
        window.location.hash = `#/server/${encodeURIComponent(known.id)}`
        return
      }
      // Check the address directly (stateless).
      const result = await probeExternalServer(target)
      setExternalProbe(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="surface-panel" style={{ flexDirection: 'column', gap: 'var(--p31-space-3)', marginBottom: 'var(--p31-space-4)', borderColor: 'color-mix(in oklab, var(--p31-accent) 35%, transparent)' }}>
      <div className="surface-card-title">Try a server</div>
      <div className="surface-card-desc">
        Paste a server address. We check it and show its tools.
      </div>
      <div style={{ display: 'flex', gap: 'var(--p31-space-2)', flexWrap: 'wrap', alignItems: 'end' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <Input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void inspect() }}
            aria-label="Server address to try"
          />
        </div>
        <button
          type="button"
          className="btn-sm"
          onClick={() => void inspect()}
          disabled={busy}
          style={{ background: 'var(--p31-accent)', color: 'var(--p31-void)', fontWeight: 600, padding: '8px 18px', borderRadius: 'var(--p31-radius-md)' }}
        >
          {busy ? 'Checking…' : '🔍 Try it'}
        </button>
      </div>

      {error && <div className="setup-err">{error}</div>}

      {externalProbe && <InspectResult probe={externalProbe} onOpenTool={(tool) => { selectTool(tool); useMarketplaceStore.setState({ selectedServerId: EXTERNAL_SERVER_ID }); window.location.hash = '#/playground' }} />}
    </section>
  )
}

function normalizeUrl(u: string): string {
  return u.trim().replace(/\/+$/, '').toLowerCase()
}

function InspectResult({ probe, onOpenTool }: { probe: ExternalProbeResult; onOpenTool: (tool: string) => void }) {
  const statusColor = probe.status === 'ok' ? 'var(--p31-accent-green)' : probe.status === 'degraded' ? 'var(--p31-accent-gold)' : 'var(--p31-accent-red)'
  const tools = probe.tools ?? []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-2)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '1.6rem' }} aria-hidden="true">🛰️</span>
        <span className="surface-card-title">{probe.serverInfo?.name ?? 'A server with no name'}</span>
        <span className="chip" style={{ color: statusColor, borderColor: `color-mix(in oklab, ${statusColor} 40%, transparent)` }}>
          {probe.status === 'ok' ? 'Connected' : probe.status === 'degraded' ? 'Partially working' : 'Could not connect'}
        </span>
        {probe.protocolVersion && <span className="chip" style={{ color: 'var(--p31-accent-violet)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }}>{probe.protocolVersion}</span>}
        <span className="chip" style={{ color: 'var(--p31-text-muted)' }}>{tools.length} tool{tools.length === 1 ? '' : 's'}</span>
        {probe.latencyMs !== undefined && <span className="chip" style={{ color: 'var(--p31-text-muted)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }}>{probe.latencyMs}ms</span>}
      </div>

      {probe.status !== 'ok' && (
        <div className="setup-err" role="alert">
          {probe.status === 'dead' ? 'That address is not a working server.' : 'The server answered partway. Some data is missing.'} {probe.error}
        </div>
      )}

      {probe.status === 'ok' && (
        <>
          <ToolExplorer tools={tools} onOpenTool={onOpenTool} />
          <div style={{ display: 'flex', gap: 'var(--p31-space-2)' }}>
            <button type="button" className="btn-sm" style={{ background: 'var(--p31-accent)', color: 'var(--p31-void)', fontWeight: 600, padding: '8px 16px', borderRadius: 'var(--p31-radius-md)' }} onClick={() => onOpenTool(tools[0]?.name ?? '')}>
              🛠️ Open in the playground →
            </button>
          </div>
        </>
      )}

      {(probe.initializeRequest || probe.toolsRequest) && (
        <details>
          <summary style={{ color: 'var(--p31-text-muted)', fontSize: 'var(--p31-text-xs)', cursor: 'pointer' }}>Show technical details</summary>
          <pre style={{ marginTop: 'var(--p31-space-2)', background: 'var(--p31-surface2)', borderRadius: 'var(--p31-radius-sm)', padding: 'var(--p31-space-2)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)', color: 'var(--p31-text-secondary)', overflow: 'auto', maxHeight: 260 }}>
            {'▶ first check (sent)\n'}{probe.initializeRequest ?? ''}{'\n\n◀ first check (answer)\n'}{probe.initializeResponse ?? ''}{'\n\n▶ tool list (sent)\n'}{probe.toolsRequest ?? ''}{'\n\n◀ tool list (answer)\n'}{(probe.toolsResponse ?? '').slice(0, 4000)}
          </pre>
        </details>
      )}
    </div>
  )
}