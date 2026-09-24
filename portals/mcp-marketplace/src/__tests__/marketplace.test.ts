import { describe, it, expect } from 'vitest'
import type { ToolSchema } from '@/types'
import { toolRisk, serverReadOnlySafe } from '@/lib/risk'
import {
  fieldsFromSchema,
  defaultsFromSchema,
  sampleArgs,
  validateArgs,
  coerceArgs,
} from '@/lib/schemaForm'
import { newEvent, toMarkdown } from '@/lib/sessionLog'

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