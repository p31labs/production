import { useEffect, useState } from 'react'

/**
 * MCPRegistryQuery — the transducer for the MCP marketplace.
 * Queries the live registry and renders the real tool list. Specifics, not
 * claims — the page calls the actual endpoint.
 */
interface RegistryServer {
  name?: string
  tools?: number
  endpoint?: string
}

const REGISTRY_URL = 'https://mcp-registry.trimtab-signal.workers.dev/servers'

export default function MCPRegistryQuery() {
  const [servers, setServers] = useState<RegistryServer[]>([])
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(REGISTRY_URL)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!cancelled) {
          setServers(Array.isArray(data) ? data : (data as { servers?: RegistryServer[] }).servers ?? [])
          setState('ok')
        }
      } catch {
        if (!cancelled) setState('error')
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--p31-glass-border)', background: 'var(--p31-surface)' }}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg font-semibold" style={{ color: 'var(--p31-text)' }}>🧩 MCP registry · live</span>
        <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: state === 'ok' ? 'color-mix(in oklab, var(--p31-chain-verified, #788c5d) 15%, transparent)' : 'color-mix(in oklab, var(--p31-chain-pending, #d97757) 15%, transparent)', color: state === 'ok' ? 'var(--p31-chain-verified, #788c5d)' : 'var(--p31-chain-pending, #d97757)' }}>
          {state === 'ok' ? 'connected' : state === 'loading' ? 'connecting…' : 'offline'}
        </span>
      </div>

      {state === 'loading' && <div className="text-sm" style={{ color: 'var(--p31-text-secondary)' }}>Querying the registry…</div>}
      {state === 'error' && <div className="text-sm" style={{ color: 'var(--p31-chain-broken, #c0392b)' }}>Registry unreachable — this is the live state, not a mock.</div>}
      {state === 'ok' && (
        <div className="space-y-1.5">
          {servers.length === 0 && <div className="text-sm" style={{ color: 'var(--p31-text-secondary)' }}>No servers returned by the live endpoint.</div>}
          {servers.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-sm rounded px-2 py-1" style={{ background: 'var(--p31-surface2)' }}>
              <span style={{ color: 'var(--p31-text)' }}>{s.name ?? `server ${i + 1}`}</span>
              {typeof s.tools === 'number' && <span className="ml-auto text-xs font-mono" style={{ color: 'var(--p31-text-tertiary)' }}>{s.tools} tools</span>}
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs" style={{ color: 'var(--p31-text-tertiary)' }}>
        This panel calls the real registry endpoint — what you see is what's deployed right now.
      </p>
    </div>
  )
}