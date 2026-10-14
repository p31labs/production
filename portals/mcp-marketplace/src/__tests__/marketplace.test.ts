import { describe, it, expect } from 'vitest'
import type { ToolSchema } from '@/types'
import { toolRisk, serverReadOnlySafe } from '@/lib/risk'
import {
  fieldsFromSchema,
  defaultsFromSchema,
  prefillsFromSchema,
  sampleArgs,
  validateArgs,
  coerceArgs,
} from '@/lib/schemaForm'
import { newEvent, toMarkdown } from '@/lib/sessionLog'
import { parseMcpBody, buildInitialize, buildToolsCall, PROTOCOL_VERSION } from '@/lib/mcpWire'
import { buildSnapshot, parseSnapshot } from '@/lib/snapshot'
import { parseCalls, probeLlm, DEFAULT_LLM_CONFIG } from '@/lib/llm'
import { manifestToPayload, type P31McpManifest } from '@/lib/registryClient'

describe('risk model', () => {
  it('classifies read vs write tool names', () => {
    expect(toolRisk('list_tokens')).toBe('read')
    expect(toolRisk('get_component')).toBe('read')
    expect(toolRisk('pqc_verify')).toBe('read')
    expect(toolRisk('create_thing')).toBe('write')
    expect(toolRisk('pqc_sign')).toBe('write')
    expect(toolRisk('execute_command')).toBe('write')
  })

  it('gates write tools even on read-only-safe servers', () => {
    expect(serverReadOnlySafe(true, 'list_tokens')).toBe(true)
    expect(serverReadOnlySafe(true, 'create_thing')).toBe(false)
    expect(serverReadOnlySafe(false, 'list_tokens')).toBe(false)
  })
})

describe('schema form', () => {
  const schema: ToolSchema = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'token path' },
      category: { type: 'string', enum: ['all', 'color', 'spacing'], default: 'all' },
      count: { type: 'integer' },
      verbose: { type: 'boolean' },
      meta: { type: 'object' },
      tags: { type: 'array', items: { type: 'string' } },
    },
    required: ['path'],
  }

  it('builds fields from schema with correct kinds', () => {
    const fields = fieldsFromSchema(schema)
    expect(fields.find((f) => f.key === 'path')?.kind).toBe('string')
    expect(fields.find((f) => f.key === 'category')?.kind).toBe('enum')
    expect(fields.find((f) => f.key === 'count')?.kind).toBe('number')
    expect(fields.find((f) => f.key === 'verbose')?.kind).toBe('boolean')
    expect(fields.find((f) => f.key === 'meta')?.kind).toBe('json')
    expect(fields.find((f) => f.key === 'tags')?.kind).toBe('json')
    expect(fields.find((f) => f.key === 'path')?.required).toBe(true)
  })

  it('honors schema defaults and samples args', () => {
    expect(defaultsFromSchema(schema).category).toBe('all')
    expect(sampleArgs(schema).category).toBe('all')
    expect(sampleArgs(schema).verbose).toBe(false)
  })

  it('validates required + numbers + JSON fields', () => {
    expect(validateArgs({}, schema).length).toBeGreaterThan(0)
    expect(validateArgs({ path: 'a', count: 'x' as unknown as number }, schema).some((e) => e.includes('count'))).toBe(true)
    expect(validateArgs({ path: 'a', meta: 'not json' }, schema).some((e) => e.includes('meta'))).toBe(true)
    expect(validateArgs({ path: 'a', meta: '{"x":1}', tags: '["a"]' }, schema)).toEqual([])
  })

  it('coerces JSON textarea + number strings back into structured args', () => {
    const out = coerceArgs({ path: 'a', meta: '{"x":1}', count: '5' }, schema)
    expect(out.meta).toEqual({ x: 1 })
    expect(out.count).toBe(5)
  })
})

describe('session log', () => {
  it('creates events and serializes to markdown', () => {
    const ev = newEvent('srv', 'Server', 'tool_a', { q: 'x' }, 'read')
    expect(ev.status).toBe('running')
    const md = toMarkdown([ev])
    expect(md).toContain('Server › tool_a')
    expect(md).toContain('"q": "x"')
  })
})

describe('schema form — C-2 annotations', () => {
  const schema: ToolSchema = {
    type: 'object',
    properties: {
      mode: { type: 'string', description: 'output mode', default: 'fast', examples: ['safe', 'turbo'] },
      seed: { type: 'integer', examples: [42] },
    },
  }

  it('exposes type/description/default/examples on fields', () => {
    const fields = fieldsFromSchema(schema)
    const mode = fields.find((f) => f.key === 'mode')
    expect(mode?.type).toBe('string')
    expect(mode?.description).toBe('output mode')
    expect(mode?.default).toBe('fast')
    expect(mode?.examples).toEqual(['safe', 'turbo'])
  })

  it('prefills defaults first, then examples', () => {
    const pre = prefillsFromSchema(schema)
    expect(pre.mode).toBe('fast')
    expect(pre.seed).toBe(42)
    // sampleArgs is the "make up a plausible value" path: enum → example → type fallback.
    expect(sampleArgs(schema).mode).toBe('safe')
    expect(sampleArgs(schema).seed).toBe(42)
  })
})

describe('mcpWire — B-2/C-1 JSON-RPC helpers', () => {
  it('builds spec-shaped requests (2026-07-28)', () => {
    const init = buildInitialize()
    expect(init.jsonrpc).toBe('2.0')
    expect(init.method).toBe('initialize')
    expect((init.params as Record<string, unknown>).protocolVersion).toBe(PROTOCOL_VERSION)
    expect(PROTOCOL_VERSION).toBe('2026-07-28')
    const call = buildToolsCall('list_things', { q: 'x' })
    expect(call.params).toEqual({ name: 'list_things', arguments: { q: 'x' } })
  })

  it('parses plain JSON bodies', () => {
    const msgs = parseMcpBody('{"jsonrpc":"2.0","id":1,"result":{"ok":true}}')
    expect(msgs).toHaveLength(1)
    expect(msgs[0].id).toBe(1)
  })

  it('parses SSE-framed bodies', () => {
    const msgs = parseMcpBody('event: message\ndata: {"jsonrpc":"2.0","id":2,"result":{"tools":[]}}\n')
    expect(msgs).toHaveLength(1)
    expect(msgs[0].result?.tools).toEqual([])
  })

  it('degrades on garbage bodies instead of throwing', () => {
    expect(parseMcpBody('not json at all')).toEqual([])
    expect(parseMcpBody('')).toEqual([])
  })
})

describe('snapshot — C-3 export/import', () => {
  it('round-trips a snapshot', () => {
    const ev = newEvent('srv', 'Server', 'tool_a', { q: 'x' }, 'read')
    const snap = buildSnapshot({ serverId: 'srv', tool: 'tool_a', args: { q: 'x' }, result: { ok: true } }, [ev])
    const parsed = parseSnapshot(JSON.stringify(snap))
    expect(parsed.error).toBeUndefined()
    expect(parsed.snapshot?.format).toBe('p31-mcp-playground-snapshot')
    expect(parsed.snapshot?.session).toHaveLength(1)
    expect(parsed.snapshot?.state.serverId).toBe('srv')
  })

  it('rejects non-JSON, wrong format, wrong version, bad events', () => {
    expect(parseSnapshot('nope')).toHaveProperty('error')
    expect(parseSnapshot('{"format":"other","version":1,"session":[]}').error).toContain('not a saved session')
    expect(parseSnapshot('{"format":"p31-mcp-playground-snapshot","version":2,"session":[]}').error).toContain('version')
    expect(parseSnapshot('{"format":"p31-mcp-playground-snapshot","version":1,"session":{}}').error).toContain('array')
    expect(parseSnapshot('{"format":"p31-mcp-playground-snapshot","version":1,"session":[{"id":1}]}').error).toBeDefined()
  })
})

describe('llm console — C-4', () => {
  it('disabled backend probes as unreachable with an explicit reason', async () => {
    const p = await probeLlm({ ...DEFAULT_LLM_CONFIG, backend: 'disabled' })
    expect(p.reachable).toBe(false)
    expect(p.detail).toContain('off')
  })

  it('parses fenced and bare JSON arrays of tool calls', () => {
    expect(parseCalls('```json\n[{"tool":"list_things","args":{"q":"x"},"reason":"r"}]\n```')).toEqual([
      { tool: 'list_things', args: { q: 'x' }, reason: 'r' },
    ])
    expect(parseCalls('Sure! [{"tool":"a","args":{}}]')).toHaveLength(1)
    expect(parseCalls('no calls here')).toEqual([])
  })
})

describe('publish manifest — D-2/D-3 validation', () => {
  it('normalizes a valid manifest into a register payload', () => {
    const m: P31McpManifest = {
      manifestVersion: 1,
      name: 'My Cool Server!',
      description: 'Desc',
      url: 'https://example.com/mcp',
      category: 'finance',
      tags: ['a', 'b'],
    }
    const { payload, errors } = manifestToPayload(m)
    expect(errors).toEqual([])
    expect(payload?.id).toBe('my-cool-server')
    expect(payload?.endpoint).toBe('https://example.com/mcp')
    expect(payload?.category).toBe('finance')
  })

  it('missing name/url/description produce clear errors (negative control)', () => {
    const { errors } = manifestToPayload({} as P31McpManifest)
    expect(errors.some((e) => e.includes('name'))).toBe(true)
    expect(errors.some((e) => e.includes('url'))).toBe(true)
    expect(errors.some((e) => e.includes('description'))).toBe(true)
  })

  it('rejects non-http urls', () => {
    const { errors } = manifestToPayload({ name: 'x', description: 'd', url: 'ftp://nope' } as P31McpManifest)
    expect(errors.some((e) => e.includes('url'))).toBe(true)
  })
})