import type { ServerSummary, ServerDetail, ToolDef, CategoryCount, MeResponse } from '@/types'
import { authHeaders } from '@/lib/auth'

/**
 * Registry client — talks to the P31 MCP Marketplace API
 * (https://mcp-registry.trimtab-signal.workers.dev). All tool calls go through
 * the registry proxy (CORS-safe; never call external MCP servers directly).
 */
export const REGISTRY_BASE = 'https://mcp-registry.trimtab-signal.workers.dev'

export class RegistryError extends Error {
  status: number
  constructor(message: string, status = 502) {
    super(message)
    this.status = status
  }
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${REGISTRY_BASE}${path}`)
  if (!res.ok) throw new RegistryError(`registry ${path} → HTTP ${res.status}`, res.status)
  return (await res.json()) as T
}

export async function listServers(params: { q?: string; category?: string; status?: string; kind?: string } = {}): Promise<ServerSummary[]> {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.category) sp.set('category', params.category)
  if (params.status) sp.set('status', params.status)
  if (params.kind) sp.set('kind', params.kind)
  const qs = sp.toString()
  const data = await getJSON<{ servers: ServerSummary[] }>(`/servers${qs ? `?${qs}` : ''}`)
  return data.servers
}

export async function getMe(): Promise<MeResponse | null> {
  const res = await fetch(`${REGISTRY_BASE}/me`, { headers: { ...authHeaders() } })
  if (!res.ok) return null
  return (await res.json()) as MeResponse
}

export async function listPending(): Promise<ServerSummary[] | null> {
  const res = await fetch(`${REGISTRY_BASE}/servers/pending`, { headers: { ...authHeaders() } })
  if (res.status === 401) return null
  const data = await res.json()
  return data?.servers ?? []
}

export async function reviewServer(id: string, action: 'approve' | 'reject', note?: string): Promise<{ error?: string; result?: unknown }> {
  const res = await fetch(`${REGISTRY_BASE}/servers/${encodeURIComponent(id)}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ action, note }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) return { error: data?.error ?? `HTTP ${res.status}` }
  return { result: data }
}

export async function getServer(id: string): Promise<ServerDetail> {
  return getJSON<ServerDetail>(`/servers/${encodeURIComponent(id)}`)
}

export async function getServerTools(id: string): Promise<ToolDef[]> {
  const data = await getJSON<{ server: string; tools: ToolDef[] }>(`/servers/${encodeURIComponent(id)}/tools`)
  return data.tools
}

export async function getCategories(): Promise<CategoryCount[]> {
  const data = await getJSON<{ categories: CategoryCount[] }>('/categories')
  return data.categories
}

/** Returns the tool-result TEXT (unwrapped from the MCP content array). */
export async function callTool(id: string, tool: string, args: Record<string, unknown>): Promise<{ text: string; raw: unknown }> {
  const res = await fetch(`${REGISTRY_BASE}/servers/${encodeURIComponent(id)}/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: tool, arguments: args } }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = data?.error?.message ?? data?.error ?? `HTTP ${res.status}`
    throw new RegistryError(String(msg), res.status)
  }
  if (data?.error) throw new RegistryError(JSON.stringify(data.error))
  const contentArr: unknown = Array.isArray(data?.content) ? data.content : Array.isArray(data?.result?.content) ? data.result.content : []
  const text = (Array.isArray(contentArr) ? contentArr : []).map((c) => (c as { text?: string })?.text ?? '').filter(Boolean).join('\n')
  return { text, raw: data }
}

export interface RegisterPayload {
  id: string
  name: string
  endpoint: string
  category: string
  description: string
  tags?: string[]
  author?: string
}

export async function registerServer(payload: RegisterPayload): Promise<{ server?: ServerSummary; error?: string }> {
  const res = await fetch(`${REGISTRY_BASE}/servers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) return { error: data?.error ?? `HTTP ${res.status}` }
  return { server: data }
}