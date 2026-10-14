import type { ExternalProbeResult, ToolDef } from '@/types'

/**
 * mcpWire.ts — minimal client-side MCP Streamable-HTTP wire helpers for
 * inspect-any-URL (B-2) and direct external-server tool calls.
 *
 * Stateless JSON-RPC 2.0 over HTTP POST, requesting protocol version
 * 2026-07-28 (servers negotiate down). Responses may be plain JSON or SSE
 * (`event: message` + `data: …`); both are parsed. Every failure degrades
 * into an explicit error result — never a throw from the probe itself.
 */

export const PROTOCOL_VERSION = '2026-07-28'

export interface JsonRpcBody {
  jsonrpc: '2.0'
  id: number
  method: string
  params?: Record<string, unknown>
}

export function buildInitialize(id = 1): JsonRpcBody {
  return {
    jsonrpc: '2.0',
    id,
    method: 'initialize',
    params: {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'p31-mcp-marketplace-inspect', version: '1.0.0' },
    },
  }
}

export function buildToolsList(id = 2): JsonRpcBody {
  return { jsonrpc: '2.0', id, method: 'tools/list' }
}

export function buildToolsCall(name: string, args: Record<string, unknown>, id = 3): JsonRpcBody {
  return { jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } }
}

interface McpMessage {
  jsonrpc?: string
  id?: number | string
  result?: Record<string, unknown>
  error?: { code?: number; message?: string; data?: unknown }
}

/** Parse a JSON-or-SSE MCP response body into its messages. */
export function parseMcpBody(text: string): McpMessage[] {
  const raw = text.trim()
  if (!raw) return []
  // SSE framing: lines like `event: message` + `data: {…}` (possibly multi-line data).
  if (/^(event:|data:)/m.test(raw)) {
    const msgs: McpMessage[] = []
    for (const line of raw.split(/\r?\n/)) {
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload) continue
      try {
        msgs.push(JSON.parse(payload) as McpMessage)
      } catch {
        /* skip undecodable SSE payload */
      }
    }
    return msgs
  }
  try {
    return [JSON.parse(raw) as McpMessage]
  } catch {
    return []
  }
}

export interface McpPostResult {
  ok: boolean
  status: number
  body: string
  error?: string
}

/** POST a JSON-RPC message to a Streamable-HTTP endpoint. Never throws. */
export async function postMcp(url: string, body: JsonRpcBody, timeoutMs = 12_000): Promise<McpPostResult> {
  try {
    const res = await Promise.race([
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify(body),
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Took longer than ${Math.round(timeoutMs / 1000)} seconds.`)), timeoutMs)),
    ])
    const text = await res.text().catch(() => '')
    return { ok: res.ok, status: res.status, body: text }
  } catch (e: unknown) {
    const isNetwork = e instanceof TypeError && /fetch|network/i.test(String(e))
    const detail = isNetwork ? 'We couldn\u2019t reach that server. Check the address and try again.' : e instanceof Error ? e.message : String(e)
    return { ok: false, status: 0, body: '', error: detail }
  }
}

export interface ExternalToolCall {
  text: string
  raw: unknown
  requestBody: string
  responseBody: string
  error?: string
}

/** Call a tool on an external URL directly (client-side JSON-RPC, stateless). */
export async function callToolDirect(url: string, name: string, args: Record<string, unknown>): Promise<ExternalToolCall> {
  const callBody = buildToolsCall(name, args)
  const res = await postMcp(url, callBody)
  if (!res.ok) {
    return { text: '', raw: null, requestBody: JSON.stringify(callBody), responseBody: res.body, error: res.error ?? `HTTP ${res.status}: ${res.body.slice(0, 300)}` }
  }
  const msgs = parseMcpBody(res.body)
  const msg = msgs.find((m) => m.id === callBody.id) ?? msgs[msgs.length - 1]
  if (msg?.error) {
    return { text: '', raw: msg.error, requestBody: JSON.stringify(callBody), responseBody: res.body, error: msg.error.message ?? JSON.stringify(msg.error) }
  }
  const content = Array.isArray(msg?.result?.content) ? (msg.result.content as Array<{ type?: string; text?: string }>) : []
  const text = content.map((c) => c.text ?? '').filter(Boolean).join('\n')
  return { text, raw: msg?.result ?? null, requestBody: JSON.stringify(callBody), responseBody: res.body }
}

const TOOL_VERBS = /(create|update|delete|remove|set|put|post|write|insert|add|sign|issue|execute|run|approve|reject|resolve|transfer|send|mint|burn|deposit|release|accept|request|submit|upvote|downvote|claim|lock|unlock|deploy|publish|mutate|revoke)/

function toolRiskFromName(name: string): 'read' | 'write' {
  return TOOL_VERBS.test(name) ? 'write' : 'read'
}

interface RawTool {
  name?: string
  description?: string
  inputSchema?: unknown
}

/** B-2: probe an arbitrary MCP URL (initialize + tools/list), stateless. */
export async function probeExternalServer(url: string): Promise<ExternalProbeResult> {
  const base: ExternalProbeResult = { url, status: 'dead', probedAt: new Date().toISOString() }
  const start = performance.now()

  const initBody = buildInitialize(1)
  const init = await postMcp(url, initBody)
  base.initializeRequest = JSON.stringify(initBody)
  base.initializeResponse = init.body || undefined
  if (!init.ok) {
    base.error = init.error ?? 'The first check did not work.'
    base.latencyMs = Math.round(performance.now() - start)
    return base
  }
  const initMsgs = parseMcpBody(init.body)
  const initMsg = initMsgs.find((m) => m.id === initBody.id) ?? initMsgs[initMsgs.length - 1]
  if (!initMsg || initMsg.error) {
    base.status = 'degraded'
    base.error = initMsg?.error?.message ?? 'The server answered partway.'
    base.latencyMs = Math.round(performance.now() - start)
    return base
  }
  const result = initMsg.result ?? {}
  base.protocolVersion = (result.protocolVersion as string | undefined) ?? undefined
  const info = (result.serverInfo ?? {}) as { name?: string; version?: string }
  base.serverInfo = { name: info.name ?? 'A server with no name', version: info.version }
  base.status = 'degraded' // handshake ok; tools/list decides "ok"

  const toolsBody = buildToolsList(2)
  const tools = await postMcp(url, toolsBody)
  base.toolsRequest = JSON.stringify(toolsBody)
  base.toolsResponse = tools.body || undefined
  base.latencyMs = Math.round(performance.now() - start)

  if (!tools.ok) {
    base.error = tools.error ?? 'The tool list did not come back.'
    return base
  }
  const toolsMsgs = parseMcpBody(tools.body)
  const toolsMsg = toolsMsgs.find((m) => m.id === toolsBody.id) ?? toolsMsgs[toolsMsgs.length - 1]
  if (!toolsMsg || toolsMsg.error) {
    base.error = toolsMsg?.error?.message ?? 'The tool list did not come back.'
    return base
  }
  const rawTools = Array.isArray(toolsMsg.result?.tools) ? (toolsMsg.result.tools as RawTool[]) : []
  base.tools = rawTools
    .filter((t) => typeof t?.name === 'string')
    .map((t) => ({
      name: t.name as string,
      description: typeof t.description === 'string' ? t.description : undefined,
      inputSchema: (typeof t.inputSchema === 'object' && t.inputSchema !== null ? t.inputSchema : undefined) as ToolDef['inputSchema'],
      risk: toolRiskFromName(t.name as string),
    }))
  base.status = 'ok'
  base.error = undefined
  return base
}