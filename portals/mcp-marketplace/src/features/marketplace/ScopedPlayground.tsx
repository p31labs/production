import { useState } from 'react'
import { Select } from '@p31ca/design-core/canon-v2'
import type { ToolDef } from '@/types'
import { callTool } from '@/lib/registryClient'
import { toolRisk } from '@/lib/risk'
import { newEvent } from '@/lib/sessionLog'
import { useMarketplaceStore } from '@/store/marketplaceStore'
import { RiskChip } from './components'
import { ToolForm } from '@/features/playground/components/ToolForm'
import { ResultConsole } from '@/features/playground/components/ResultConsole'

/**
 * ScopedPlayground — the storefront's embedded playground (B-1). Runs tools
 * for THIS server only, through the registry proxy, with the same raw
 * JSON-RPC capture as the full playground (C-1).
 */
export function ScopedPlayground({ serverId, serverName, tools, readOnlySafe, initialTool }: {
  serverId: string
  serverName: string
  endpoint?: string
  tools: ToolDef[]
  readOnlySafe: boolean
  initialTool?: string | null
}) {
  const pushSession = useMarketplaceStore((s) => s.pushSession)
  const updateSession = useMarketplaceStore((s) => s.updateSession)
  const [toolName, setToolName] = useState<string | null>(initialTool ?? tools[0]?.name ?? null)
  const [busy, setBusy] = useState(false)
  const [lastResult, setLastResult] = useState<unknown>(undefined)
  const [lastError, setLastError] = useState<string | undefined>(undefined)
  const [lastLatency, setLastLatency] = useState<number | undefined>(undefined)
  const [lastRequest, setLastRequest] = useState<string | undefined>(undefined)
  const [lastResponse, setLastResponse] = useState<string | undefined>(undefined)

  const tool = tools.find((t) => t.name === toolName) ?? null

  const run = async (args: Record<string, unknown>) => {
    if (!tool) return
    const risk = toolRisk(tool.name)
    const ev = newEvent(serverId, serverName, tool.name, args, risk)
    pushSession(ev)
    setBusy(true)
    setLastResult(undefined)
    setLastError(undefined)
    setLastLatency(undefined)
    setLastRequest(undefined)
    setLastResponse(undefined)
    const start = performance.now()
    try {
      const { text, requestBody, responseBody } = await callTool(serverId, tool.name, args)
      let parsed: unknown = text
      try {
        parsed = JSON.parse(text)
      } catch {
        /* raw text */
      }
      const latency = Math.round(performance.now() - start)
      setLastResult(parsed)
      setLastLatency(latency)
      setLastRequest(requestBody)
      setLastResponse(responseBody)
      updateSession(ev.id, { status: 'done', result: parsed, latencyMs: latency, request: requestBody, response: responseBody })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setLastError(msg)
      updateSession(ev.id, { status: 'error', error: msg })
    } finally {
      setBusy(false)
    }
  }

  if (tools.length === 0) {
    return <div className="landing-sub">This server has no tools to try yet.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-3)' }}>
      <div className="surface-panel" style={{ alignItems: 'center', gap: 'var(--p31-space-3)', flexWrap: 'wrap' }}>
        <span className="surface-card-title" style={{ fontSize: 'var(--p31-text-base)' }}>Playground</span>
        <div style={{ minWidth: 180 }}>
          <Select
            label="Tool"
            options={tools.map((t) => ({ value: t.name, label: t.name }))}
            value={toolName ?? ''}
            onChange={(e) => setToolName(e.target.value || null)}
          />
        </div>
        {tool && <RiskChip risk={tool.risk} />}
        <a href="#/playground" style={{ marginLeft: 'auto', color: 'var(--p31-accent)', fontSize: 'var(--p31-text-sm)' }}>Go to the playground →</a>
      </div>

      {tool && (
        <ToolForm
          key={`${serverId}:${tool.name}`}
          tool={tool}
          serverReadOnlySafe={readOnlySafe}
          onRun={(args) => void run(args)}
          busy={busy}
        />
      )}

      {(lastResult !== undefined || lastError) && (
        <ResultConsole
          result={lastResult}
          error={lastError}
          latencyMs={lastLatency}
          serverName={serverName}
          tool={tool?.name}
          requestBody={lastRequest}
          responseBody={lastResponse}
        />
      )}
    </div>
  )
}