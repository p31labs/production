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
  if (!res.ok) throw new RegistryError(`The catalog could not answer right now. Try again in a minute. (${res.status})`, res.status)
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

/** Returns the tool-result TEXT (unwrapped from the MCP content array) plus the
 * exact JSON-RPC exchange (C-1: raw request body + raw response body). */
export async function callTool(
  id: string,
  tool: string,
  args: Record<string, unknown>,
): Promise<{ text: string; raw: unknown; requestBody: string; responseBody: string }> {
  const requestBody = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: tool, arguments: args } })
  const res = await fetch(`${REGISTRY_BASE}/servers/${encodeURIComponent(id)}/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: requestBody,
  })
  const responseBody = await res.text().catch(() => '')
  let data: unknown = null
  try {
    data = JSON.parse(responseBody)
  } catch {
    /* non-JSON error body — keep raw text */
  }
  if (!res.ok) {
    const e = (data as { error?: { message?: string } | string } | null)?.error
    const msg = typeof e === 'object' && e && 'message' in e ? e.message : typeof e === 'string' ? e : `HTTP ${res.status}`
    throw new RegistryError(String(msg), res.status)
  }
  if ((data as { error?: unknown })?.error) {
    throw new RegistryError(JSON.stringify((data as { error?: unknown }).error))
  }
  const contentArr: unknown = Array.isArray((data as { content?: unknown[] })?.content)
    ? (data as { content?: unknown[] }).content
    : Array.isArray((data as { result?: { content?: unknown[] } })?.result?.content)
      ? (data as { result: { content: unknown[] } }).result.content
      : []
  const text = (Array.isArray(contentArr) ? contentArr : []).map((c) => (c as { text?: string })?.text ?? '').filter(Boolean).join('\n')
  return { text, raw: data, requestBody, responseBody }
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

/** The `.p31-mcp.json` publish manifest (D-2/D-3) — a sovereign publish doc. */
export interface P31McpManifest {
  manifestVersion?: 1
  name: string
  description: string
  url: string
  category?: string
  tags?: string[]
  author?: string
  tools?: Array<{ name: string; description?: string; inputSchema?: unknown }>
}

/** Normalize a manifest into a register payload; returns validation errors. */
export function manifestToPayload(m: P31McpManifest): { payload?: RegisterPayload; errors: string[] } {
  const errors: string[] = []
  if (!m || typeof m !== 'object') return { errors: ['The file must hold a JSON object.'] }
  if (!m.name || typeof m.name !== 'string' || !m.name.trim()) errors.push('The file needs a "name".')
  if (!m.url || typeof m.url !== 'string' || !/^https?:\/\//.test(m.url)) errors.push('The file needs a web address in "url".')
  if (!m.description || typeof m.description !== 'string') errors.push('The file needs a "description".')
  if (errors.length > 0) return { errors }
  const id = (m.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')) || 'unnamed'
  const payload: RegisterPayload = {
    id,
    name: m.name.trim(),
    endpoint: m.url.trim(),
    category: (m.category ?? 'infra'),
    description: m.description.trim(),
    tags: Array.isArray(m.tags) ? m.tags.map((t) => String(t)).slice(0, 12) : [],
    author: m.author,
  }
  return { payload, errors }
}

export async function registerServer(payload: RegisterPayload): Promise<{ server?: ServerSummary; error?: string }> {
  const res = await fetch(`${REGISTRY_BASE}/servers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) return { error: data?.error ?? 'The catalog could not save it right now. Try again.' }
  return { server: data }
}