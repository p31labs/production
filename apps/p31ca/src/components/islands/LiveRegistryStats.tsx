import { useEffect, useState } from 'react'

/**
 * LiveRegistryStats — the client-side half of the hub's live-proof strip.
 *
 * The page prerenders build-time numbers (server-side fetch at build, with
 * ground-truth/content/registry-stats.json as the offline fallback). This
 * island re-queries the live registry once after hydration and swaps the
 * numbers in place. If the registry is unreachable, the build-time snapshot
 * stays — graceful degradation, never a broken stat.
 *
 * data-fresh="fresh|snapshot" lets CSS dim the strip when values are the
 * build-time snapshot rather than the live read.
 */
interface Props {
  servers: number
  live: number
  tools: number
}

const REGISTRY_URL = 'https://mcp-registry.trimtab-signal.workers.dev/servers'

interface RegistryServer {
  status?: string
  toolCount?: number
  tools?: unknown[]
}

function toolCountOf(server: RegistryServer): number {
  const explicit = Number(server?.toolCount)
  if (Number.isFinite(explicit) && explicit > 0) return explicit
  if (Array.isArray(server?.tools)) return server.tools.length
  return 0
}

export default function LiveRegistryStats({ servers, live, tools }: Props) {
  const [values, setValues] = useState({ servers, live, tools })
  const [fresh, setFresh] = useState<'fresh' | 'snapshot'>('snapshot')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(REGISTRY_URL)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const list: RegistryServer[] = Array.isArray(data) ? data : (data as { servers?: RegistryServer[] }).servers ?? []
        if (!cancelled && Array.isArray(list) && list.length > 0) {
          setValues({
            servers: list.length,
            live: list.filter((s) => s?.status === 'live').length,
            tools: list.reduce((sum, s) => sum + toolCountOf(s), 0),
          })
          setFresh('fresh')
        }
      } catch {
        /* registry unreachable — keep the build-time snapshot */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <span className="p31-stats-registry" data-fresh={fresh}>
      <span className="p31-stats-registry__value">{values.servers}</span> servers
      <span aria-hidden="true" className="p31-stats-registry__sep">·</span>
      <span className="p31-stats-registry__value">{values.live}</span> live
      <span aria-hidden="true" className="p31-stats-registry__sep">·</span>
      <span className="p31-stats-registry__value">{values.tools}</span> tools
    </span>
  )
}