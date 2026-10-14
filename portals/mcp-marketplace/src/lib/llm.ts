import type { LlmConfig, LlmToolCall, ToolDef } from '@/types'

/**
 * llm.ts — the LLM Test Console backend (C-4).
 *
 * Default backend is a local LiteLLM gateway at http://localhost:4001
 * (OpenAI-compatible /v1/chat/completions). The console ships with
 * configurable settings (LiteLLM URL/model, hosted provider base URL + API
 * key, or disabled). Probing is live: an unreachable or disabled backend
 * produces an explicit unavailable state — never a silent failure.
 */

const CONFIG_KEY = 'p31:mcp:llm-config'

export const DEFAULT_LLM_CONFIG: LlmConfig = {
  backend: 'litellm',
  litellmUrl: 'http://localhost:4001',
  litellmModel: 'gpt-4o-mini',
  hostedBaseUrl: '',
  hostedApiKey: '',
  hostedModel: 'gpt-4o-mini',
}

export function loadLlmConfig(): LlmConfig {
  try {
    const stored = localStorage.getItem(CONFIG_KEY)
    if (!stored) return { ...DEFAULT_LLM_CONFIG }
    return { ...DEFAULT_LLM_CONFIG, ...(JSON.parse(stored) as Partial<LlmConfig>) }
  } catch {
    return { ...DEFAULT_LLM_CONFIG }
  }
}

export function saveLlmConfig(cfg: LlmConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
  } catch {
    /* storage unavailable — config stays in memory */
  }
}

export interface LlmProbe {
  reachable: boolean
  detail?: string
  latencyMs?: number
}

function endpointFor(cfg: LlmConfig): { baseUrl: string; apiKey?: string; model: string } | null {
  if (cfg.backend === 'disabled') return null
  if (cfg.backend === 'litellm') {
    return { baseUrl: cfg.litellmUrl.replace(/\/+$/, ''), model: cfg.litellmModel || 'gpt-4o-mini' }
  }
  return { baseUrl: cfg.hostedBaseUrl.replace(/\/+$/, ''), apiKey: cfg.hostedApiKey, model: cfg.hostedModel || 'gpt-4o-mini' }
}

/** Live probe of the configured backend (GET /v1/models). Never throws. */
export async function probeLlm(cfg: LlmConfig): Promise<LlmProbe> {
  const ep = endpointFor(cfg)
  if (!ep) return { reachable: false, detail: 'The helper is off. Turn it on in settings.' }
  if (!/^https?:\/\//.test(ep.baseUrl)) return { reachable: false, detail: `That is not a web address: ${ep.baseUrl}` }
  const start = performance.now()
  try {
    const headers: Record<string, string> = {}
    if (ep.apiKey) headers.Authorization = `Bearer ${ep.apiKey}`
    const res = await Promise.race([
      fetch(`${ep.baseUrl}/v1/models`, { headers }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('The helper took too long (6 seconds).')), 6000)),
    ])
    if (res.ok) {
      return { reachable: true, latencyMs: Math.round(performance.now() - start) }
    }
    return { reachable: false, detail: `The helper answered with an error (${res.status}).`, latencyMs: Math.round(performance.now() - start) }
  } catch (e: unknown) {
    return {
      reachable: false,
      detail: e instanceof TypeError && /fetch|network/i.test(String(e)) ? 'The helper isn\u2019t connected right now.' : e instanceof Error ? e.message : String(e),
    }
  }
}

const SYSTEM_PROMPT = `You are the P31 MCP Marketplace LLM Test Console. Given a user's intent and a list of available MCP tools (name, description, JSON Schema), respond with ONLY a JSON array of tool calls to execute, each shaped like:
[{"tool": "<tool name>", "args": { ... }, "reason": "<why this edge case>"}]
Generate edge-case arguments (boundaries, empty values, unusual-but-valid inputs). Use ONLY the listed tool names. If the intent cannot be served by any tool, return []. No prose outside the JSON array.`

function toolsBlock(tools: ToolDef[]): string {
  return tools
    .map((t) => `- ${t.name}: ${t.description ?? '(no description)'}\n  schema: ${JSON.stringify(t.inputSchema ?? {})}`)
    .join('\n')
}

export interface GenerateResult {
  calls?: LlmToolCall[]
  error?: string
}

/** Ask the configured backend to generate edge-case tool calls. Never throws. */
export async function generateToolCalls(cfg: LlmConfig, intent: string, tools: ToolDef[]): Promise<GenerateResult> {
  const ep = endpointFor(cfg)
  if (!ep) return { error: 'The helper is off. Turn it on in settings to use it.' }
  if (tools.length === 0) return { error: 'This server has no tools to try yet.' }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (ep.apiKey) headers.Authorization = `Bearer ${ep.apiKey}`
  try {
    const res = await Promise.race([
      fetch(`${ep.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: ep.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Available tools:\n${toolsBlock(tools)}\n\nIntent: ${intent}` },
          ],
          temperature: 0.4,
        }),
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('The helper took too long (60 seconds).')), 60_000)),
    ])
    const body = await res.text().catch(() => '')
    if (!res.ok) return { error: 'The helper answered with an error.' }
    let data: unknown = null
    try {
      data = JSON.parse(body)
    } catch {
      return { error: 'The helper sent back something unreadable.' }
    }
    const content = (data as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content ?? ''
    if (!content) return { error: 'The helper sent back nothing.' }
    const calls = parseCalls(content)
    if (calls.length === 0) return { error: 'The helper could not think of anything.' }
    return { calls }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

/** Parse the LLM JSON-array response robustly (fences, stray prose). */
export function parseCalls(content: string): LlmToolCall[] {
  let text = content.trim()
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) text = fence[1].trim()
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start < 0 || end <= start) {
    // Fall back to a single-object response.
    const oStart = text.indexOf('{')
    const oEnd = text.lastIndexOf('}')
    if (oStart < 0 || oEnd <= oStart) return []
    text = `[${text.slice(oStart, oEnd + 1)}]`
  } else {
    text = text.slice(start, end + 1)
  }
  try {
    const parsed: unknown = JSON.parse(text)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
      .map((c) => ({
        tool: typeof c.tool === 'string' ? c.tool : '',
        args: (typeof c.args === 'object' && c.args !== null ? c.args : {}) as Record<string, unknown>,
        reason: typeof c.reason === 'string' ? c.reason : undefined,
      }))
      .filter((c) => c.tool !== '')
  } catch {
    return []
  }
}