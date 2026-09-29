// Forge worker API client. Grounded in the verified worker surface:
// GET /, /health, /brand, /channels, /activity; POST /compile.
// Base is resolved at CALL time so tests can point it at a mock worker.

function envVar(name: string): string | undefined {
  const viteEnv = (import.meta as unknown as { env?: Record<string, string> }).env
  const nodeEnv = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env
  return viteEnv?.[name] ?? nodeEnv?.[name]
}

function base(): string {
  return (envVar('VITE_FORGE_API') ?? 'http://localhost:8787').replace(/\/$/, '')
}
function key(): string {
  return envVar('VITE_FORGE_KEY') ?? ''
}

export class ForgeError extends Error {
  status: number
  path: string
  constructor(status: number, path: string, message: string) {
    super(message)
    this.name = 'ForgeError'
    this.status = status
    this.path = path
  }
}

export interface ForgeInfo { name: string; version: string; endpoints: string[] }
export interface BrandEntity { name: string; ein: string; city: string; website: string }
export interface BrandData {
  colors: Record<string, string>
  themes: Record<string, string>
  type: Record<string, number>
  entity: BrandEntity
  social: Record<string, string>
}
export interface Channel { id: string; name: string; configured: boolean }
export interface ActivityEntry { id: string; kind: string; ts: string; summary: string }

export type BodyItem =
  | { type: 'h1' | 'h2' | 'para'; text: string }
  | { type: 'evidence'; claim: string; value: string; source: string; verified: string }

export interface Pack {
  kind: string
  filename: string
  title: string
  theme?: string
  date?: string
  body: BodyItem[]
  [k: string]: unknown
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('content-type', 'application/json')
  if (key()) headers.set('x-forge-key', key())
  const res = await fetch(`${base()}${path}`, { ...init, headers })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new ForgeError(res.status, path, `${path} → ${res.status} ${text.slice(0, 200)}`)
  }
  return (await res.json()) as T
}

export const api = {
  base: base(),
  hasAuth: () => Boolean(key()),

  info: () => req<ForgeInfo>('/'),
  health: () => req<{ status: string; version: string }>('/health'),
  brand: () => req<BrandData>('/brand'),
  channels: () => req<{ channels: Channel[] }>('/channels'),
  activity: (limit = 50) => req<{ entries: ActivityEntry[] }>(`/activity?limit=${limit}`),

  async compile(pack: Pack): Promise<Blob> {
    const res = await fetch(`${base()}/compile`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(key() ? { 'x-forge-key': key() } : {}),
      },
      body: JSON.stringify(pack),
    })
    if (!res.ok) throw new ForgeError(res.status, '/compile', `compile → ${res.status}`)
    return res.blob()
  },
}