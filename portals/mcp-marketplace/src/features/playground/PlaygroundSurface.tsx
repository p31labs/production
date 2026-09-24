import { useEffect, useState } from 'react'
import { useMarketplaceStore } from '@/store/marketplaceStore'
import { callTool } from '@/lib/registryClient'
import { toolRisk } from '@/lib/risk'
import { newEvent } from '@/lib/sessionLog'
import { StatusBadge, HealthDot, ScanBadge, DriftBadge, RiskChip } from '@/features/marketplace/components'
import { ToolForm } from './components/ToolForm'
import { ResultConsole } from './components/ResultConsole'
import { SessionPanel } from './components/SessionPanel'

/**
 * Playground — the interactive MCP session. Pick a server, pick a tool, fill
 * the auto-generated form, run it against the real endpoint through the
 * registry proxy. Every call is recorded in the session panel.
 */
export function PlaygroundSurface() {
  const servers = useMarketplaceStore((s) => s.servers)
  const serverDetail = useMarketplaceStore((s) => s.serverDetail)
  const selectedServerId = useMarketplaceStore((s) => s.selectedServerId)
  const selectedTool = useMarketplaceStore((s) => s.selectedTool)
  const refresh = useMarketplaceStore((s) => s.refresh)
  const loadServer = useMarketplaceStore((s) => s.loadServer)
  const selectTool = useMarketplaceStore((s) => s.selectTool)
  const pushSession = useMarketplaceStore((s) => s.pushSession)
  const updateSession = useMarketplaceStore((s) => s.updateSession)

  const [busy, setBusy] = useState(false)
  const [lastResult, setLastResult] = useState<unknown>(undefined)
  const [lastError, setLastError] = useState<string | undefined>(undefined)
  const [lastLatency, setLastLatency] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (servers.length === 0) void refresh()
  }, [servers.length, refresh])

  useEffect(() => {
    if (selectedServerId && (!serverDetail || serverDetail.id !== selectedServerId)) {
      void loadServer(selectedServerId).catch(() => {})
    }
  }, [selectedServerId, serverDetail, loadServer])

  const server = servers.find((s) => s.id === selectedServerId)
  const tool = serverDetail?.tools.find((t) => t.name === selectedTool) ?? null

  const run = async (args: Record<string, unknown>) => {
    if (!serverDetail || !tool) return
    const risk = toolRisk(tool.name)
    const ev = newEvent(serverDetail.id, serverDetail.name, tool.name, args, risk)
    pushSession(ev)
    setBusy(true)
    setLastResult(undefined)
    setLastError(undefined)
    setLastLatency(undefined)
    const start = performance.now()
    try {
      const { text } = await callTool(serverDetail.id, tool.name, args)
      let parsed: unknown = text
      try {
        parsed = JSON.parse(text)
      } catch {
        /* raw text */
      }
      const latency = Math.round(performance.now() - start)
      setLastResult(parsed)
      setLastLatency(latency)
      updateSession(ev.id, { status: 'done', result: parsed, latencyMs: latency })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setLastError(msg)
      updateSession(ev.id, { status: 'error', error: msg })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="home-container">
      <section className="home-hero">
        <h1 className="greeting-h1">Playground</h1>
        <p className="landing-sub">Every call runs against the real endpoint through the registry proxy — schemas, arguments, and results are live.</p>
      </section>

      <div className="surface-panel" style={{ display: 'flex', gap: 'var(--p31-space-3)', flexWrap: 'wrap', alignItems: 'center', marginBottom: 'var(--p31-space-4)' }}>
        <label style={{ color: 'var(--p31-text-muted)', fontSize: 'var(--p31-text-xs)' }}>
          Server
          <select
            className="setup-input"
            value={selectedServerId ?? ''}
            onChange={(e) => { loadServer(e.target.value).catch(() => {}); selectTool(null) }}
            style={{ display: 'block', marginTop: 'var(--p31-space-1)' }}
          >
            <option value="">— select a server —</option>
            {servers.filter((s) => s.kind === 'remote' || s.health === 'up').map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>

        <label style={{ color: 'var(--p31-text-muted)', fontSize: 'var(--p31-text-xs)' }}>
          Tool
          <select
            className="setup-input"
            value={selectedTool ?? ''}
            onChange={(e) => selectTool(e.target.value || null)}
            style={{ display: 'block', marginTop: 'var(--p31-space-1)' }}
          >
            <option value="">— select a tool —</option>
            {(serverDetail?.tools ?? []).map((t) => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </select>
        </label>

        {server && <span className="chip" style={{ color: 'var(--p31-text-muted)' }}>{server.endpoint}</span>}
      </div>

      {tool && serverDetail ? (
        <>
          {/* D3 — risk panel shown before every call */}
          <div className="surface-panel" style={{ marginBottom: 'var(--p31-space-3)', borderColor: tool.risk === 'write' ? 'color-mix(in oklab, var(--p31-accent-red) 50%, transparent)' : 'var(--p31-glass-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-2)', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--p31-text-primary)', fontWeight: 600 }}>Risk panel</span>
              <RiskChip risk={tool.risk} />
              <StatusBadge status={serverDetail.status} />
              <HealthDot health={serverDetail.health} />
              <ScanBadge scan={serverDetail.scan} />
              <DriftBadge drifted={serverDetail.drifted} contentHash={serverDetail.contentHash} baselineHash={serverDetail.baselineHash} />
              {serverDetail.readOnlySafe && <span className="chip" style={{ color: 'var(--p31-accent-green)' }}>read-only safe server</span>}
              {tool.risk === 'write' && <span className="chip" style={{ color: 'var(--p31-accent-red)' }}>will issue a session-scoped capability token on run</span>}
            </div>
          </div>
          <ToolForm
            key={`${serverDetail.id}:${tool.name}`}
            tool={tool}
            serverReadOnlySafe={serverDetail.readOnlySafe}
            onRun={(args) => void run(args)}
            busy={busy}
          />
        </>
      ) : (
        <div className="surface-panel">
          <div className="surface-card-desc">Select a server, then a tool, to open the auto-generated form.</div>
        </div>
      )}

      {(lastResult !== undefined || lastError) && (
        <div style={{ marginTop: 'var(--p31-space-4)' }}>
          <ResultConsole
            result={lastResult}
            error={lastError}
            latencyMs={lastLatency}
            serverName={server?.name}
            tool={tool?.name}
            endpoint={server?.endpoint}
          />
        </div>
      )}

      <div style={{ marginTop: 'var(--p31-space-4)' }}>
        <SessionPanel />
      </div>
    </div>
  )
}