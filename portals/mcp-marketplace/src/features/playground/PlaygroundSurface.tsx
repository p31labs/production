import { useEffect, useState } from 'react'
import { PageHeaderV2, Stack, Select, EmptyState } from '@p31ca/design-core/canon-v2'
import { useMarketplaceStore, EXTERNAL_SERVER_ID } from '@/store/marketplaceStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { callTool } from '@/lib/registryClient'
import { callToolDirect } from '@/lib/mcpWire'
import { toolRisk } from '@/lib/risk'
import { humanError } from '@/lib/humanErrors'
import { newEvent } from '@/lib/sessionLog'
import { ToolForm } from './components/ToolForm'
import { ResultConsole } from './components/ResultConsole'
import { SessionPanel } from './components/SessionPanel'
import { LlmConsole } from './components/LlmConsole'
import type { LlmToolCall } from '@/types'

const EXTERNAL_ID = EXTERNAL_SERVER_ID

function StepBadge({ n, label }: { n: number; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--p31-space-2)', paddingTop: 'var(--p31-space-2)' }}>
      <span className="step-badge" style={{ background: 'var(--p31-accent)', color: 'var(--p31-void)', fontWeight: 700, borderRadius: 'var(--p31-radius-full)' }} aria-hidden="true">
        {n}
      </span>
      <span style={{ color: 'var(--p31-text-primary)', fontWeight: 600 }}>{label}</span>
    </span>
  )
}

/**
 * Playground — numbered full-width steps (plan W3):
 *   Step 1 Pick a server → Step 2 Pick a tool → Step 3 Run it.
 * The exact request/response lives behind a closed "Show technical details"
 * disclosure. The helper console stays, introduced plainly.
 *
 * Canon v2: Page mode="flow" (owned by the App shell) + PageHeaderV2; the
 * steps compose Stack rows with canon Selects (data-p31-control, 44px floor
 * — the 533–1005px selects are gone with the legacy flex-stretch chain).
 * The select prompt no longer doubles the step label: each step names
 * itself once, and the control's empty option is a plain "Choose…" line.
 */
export function PlaygroundSurface() {
  const setSurface = useWorkspaceStore((s) => s.setSurface)
  const servers = useMarketplaceStore((s) => s.servers)
  const serverDetail = useMarketplaceStore((s) => s.serverDetail)
  const selectedServerId = useMarketplaceStore((s) => s.selectedServerId)
  const selectedTool = useMarketplaceStore((s) => s.selectedTool)
  const externalProbe = useMarketplaceStore((s) => s.externalProbe)
  const snapshotState = useMarketplaceStore((s) => s.snapshotState)
  const clearSnapshotState = useMarketplaceStore((s) => s.clearSnapshotState)
  const refresh = useMarketplaceStore((s) => s.refresh)
  const loadServer = useMarketplaceStore((s) => s.loadServer)
  const selectTool = useMarketplaceStore((s) => s.selectTool)
  const pushSession = useMarketplaceStore((s) => s.pushSession)
  const updateSession = useMarketplaceStore((s) => s.updateSession)

  const [busy, setBusy] = useState(false)
  const [lastResult, setLastResult] = useState<unknown>(undefined)
  const [lastError, setLastError] = useState<string | undefined>(undefined)
  const [lastLatency, setLastLatency] = useState<number | undefined>(undefined)
  const [lastRequest, setLastRequest] = useState<string | undefined>(undefined)
  const [lastResponse, setLastResponse] = useState<string | undefined>(undefined)

  const isExternal = selectedServerId === EXTERNAL_ID

  useEffect(() => {
    if (servers.length === 0) void refresh()
  }, [servers.length, refresh])

  useEffect(() => {
    if (selectedServerId && !isExternal && (!serverDetail || serverDetail.id !== selectedServerId)) {
      void loadServer(selectedServerId).catch(() => {})
    }
  }, [selectedServerId, isExternal, serverDetail, loadServer])

  useEffect(() => {
    if (snapshotState) {
      setLastResult(snapshotState.result)
      setLastError(snapshotState.error)
      clearSnapshotState()
    }
  }, [snapshotState, clearSnapshotState])

  const server = servers.find((s) => s.id === selectedServerId)
  const externalTools = externalProbe?.status === 'ok' ? (externalProbe.tools ?? []) : []
  const tools = isExternal ? externalTools : (serverDetail?.tools ?? [])
  const tool = tools.find((t) => t.name === selectedTool) ?? null
  const displayName = isExternal ? (externalProbe?.serverInfo?.name ?? 'A server with no name') : server?.name

  const serverOptions = [
    { value: '', label: 'Choose a server' },
    ...servers.map((s) => ({ value: s.id, label: s.name })),
    ...(externalProbe && externalProbe.status === 'ok'
      ? [{ value: EXTERNAL_ID, label: `${externalProbe.serverInfo?.name ?? externalProbe.url} (tried)` }]
      : []),
  ]

  const toolOptions = [
    { value: '', label: 'Choose a tool' },
    ...tools.map((t) => ({ value: t.name, label: t.name })),
  ]

  const run = async (args: Record<string, unknown>) => {
    if (!tool || (!isExternal && !serverDetail)) return
    const risk = toolRisk(tool.name)
    const ev = newEvent(isExternal ? EXTERNAL_ID : serverDetail!.id, displayName ?? 'server', tool.name, args, risk)
    pushSession(ev)
    setBusy(true)
    setLastResult(undefined)
    setLastError(undefined)
    setLastLatency(undefined)
    setLastRequest(undefined)
    setLastResponse(undefined)
    const start = performance.now()
    try {
      const { text, requestBody, responseBody } = isExternal
        ? await callToolDirect(externalProbe!.url, tool.name, args)
        : await callTool(serverDetail!.id, tool.name, args)
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
      const msg = humanError(e instanceof Error ? e.message : String(e))
      setLastError(msg)
      updateSession(ev.id, { status: 'error', error: msg })
    } finally {
      setBusy(false)
    }
  }

  const runLlmCall = async (call: LlmToolCall): Promise<{ ok: boolean; detail: string }> => {
    try {
      const { text, requestBody, responseBody } = isExternal
        ? await callToolDirect(externalProbe!.url, call.tool, call.args)
        : await callTool(serverDetail!.id, call.tool, call.args)
      const ev = newEvent(isExternal ? EXTERNAL_ID : serverDetail!.id, displayName ?? 'server', call.tool, call.args, toolRisk(call.tool))
      pushSession({ ...ev, status: 'done', result: text, request: requestBody, response: responseBody })
      return { ok: true, detail: text.slice(0, 120) || '(nothing came back)' }
    } catch (e: unknown) {
      const msg = humanError(e instanceof Error ? e.message : String(e))
      return { ok: false, detail: msg.slice(0, 160) }
    }
  }

  return (
    <>
      <PageHeaderV2
        title="Playground"
        subtitle="What happens here? Pick a server. Pick a tool. Run it for real."
      />

      <Stack gap="md">
        <Stack dir="row" gap="sm" align="start">
          <StepBadge n={1} label="Pick a server" />
          <div style={{ flex: 1, minWidth: 220 }}>
            <Select
              id="playground-server-select"
              options={serverOptions}
              value={selectedServerId ?? ''}
              onChange={(e) => {
                const v = e.target.value
                if (v && v !== EXTERNAL_ID) void loadServer(v).catch(() => {})
                selectTool(null)
              }}
              aria-label="Pick a server"
            />
          </div>
        </Stack>

        {!selectedServerId && (
          <EmptyState
            title="Pick a server to begin."
            description="Choose a server below. The next step will appear."
            action={
              <button
                type="button"
                className="btn-sm"
                onClick={() => document.getElementById('playground-server-select')?.focus()}
                style={{ background: 'var(--p31-accent)', color: 'var(--p31-void)', fontWeight: 600, padding: '8px 18px', borderRadius: 'var(--p31-radius-md)' }}
              >
                Pick a server
              </button>
            }
          />
        )}

        {selectedServerId && (
          <Stack dir="row" gap="sm" align="start">
            <StepBadge n={2} label="Pick a tool" />
            <div style={{ flex: 1, minWidth: 220 }}>
              <Select
                options={toolOptions}
                value={selectedTool ?? ''}
                onChange={(e) => selectTool(e.target.value || null)}
                aria-label="Pick a tool"
              />
            </div>
          </Stack>
        )}

        {tool ? (
          <Stack gap="sm">
            <StepBadge n={3} label="Run it" />
            <div style={{ marginTop: 'var(--p31-space-2)' }}>
              <ToolForm
                key={`${selectedServerId ?? 'none'}:${tool.name}`}
                tool={tool}
                serverReadOnlySafe={!isExternal && (serverDetail?.readOnlySafe ?? false)}
                onRun={(args) => void run(args)}
                busy={busy}
              />
            </div>
          </Stack>
        ) : (
          selectedServerId && (
            tools.length === 0 ? (
              <EmptyState
                title="No tools here yet."
                description="This server has not shared any tools. Pick another server."
                action={
                  <button
                    type="button"
                    className="btn-sm"
                    onClick={() => {
                      setSurface('discover')
                      window.location.hash = '#/discover'
                    }}
                    style={{ background: 'var(--p31-accent)', color: 'var(--p31-void)', fontWeight: 600, padding: '8px 18px', borderRadius: 'var(--p31-radius-md)' }}
                  >
                    Browse the catalog
                  </button>
                }
              />
            ) : (
              <div className="surface-panel">
                <div className="surface-card-desc">Pick a tool above. The form fills itself in.</div>
              </div>
            )
          )
        )}

        {(lastResult !== undefined || lastError) && (
          <div style={{ marginTop: 'var(--p31-space-4)' }}>
            <ResultConsole
              result={lastResult}
              error={lastError}
              latencyMs={lastLatency}
              serverName={displayName}
              tool={tool?.name}
              requestBody={lastRequest}
              responseBody={lastResponse}
            />
          </div>
        )}

        <div style={{ marginTop: 'var(--p31-space-4)' }}>
          <LlmConsole
            serverName={displayName}
            tools={tools}
            onRunCall={runLlmCall}
            onPickServer={() => document.getElementById('playground-server-select')?.focus()}
          />
        </div>

        <div style={{ marginTop: 'var(--p31-space-4)' }}>
          <SessionPanel />
        </div>
      </Stack>
    </>
  )
}