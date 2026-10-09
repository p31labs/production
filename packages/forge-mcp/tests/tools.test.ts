import { describe, it, expect, vi } from 'vitest'
import { handleTool, PackSchema } from '../src/tools.js'
import { ForgeClient } from '../src/forge-client.js'

function mockClient(overrides: Partial<ForgeClient> = {}): ForgeClient {
  const base = {
    health: vi.fn(async () => ({ status: 'ok', version: '0.2.0' })),
    brand: vi.fn(async () => ({
      colors: {},
      themes: {
        hub: { accent: 'D97757', bg: 'FAF9F5' },
        scene: { accent: '2BB3D9', bg: '0D0D12' },
      },
      type: { serif: 'Lora' },
      entity: { ein: '42-1888158' },
      social: {},
    })),
    stylize: vi.fn(async () => ({
      bytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
      filename: 'test.docx',
    })),
    compile: vi.fn(async () => ({
      bytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
      filename: 'test.docx',
    })),
  } as unknown as ForgeClient
  return Object.assign(base, overrides)
}

const ctx = () => ({ client: mockClient(), outDir: '/tmp/forge-mcp-test' })

describe('forge-mcp tools', () => {
  it('forge_health returns the service status', async () => {
    const r = await handleTool('forge_health', {}, ctx())
    const text = (r.content[0] as { text: string }).text
    expect(text).toContain('ok')
    expect(text).toContain('0.2.0')
  })

  it('forge_brand exposes both themes', async () => {
    const r = await handleTool('forge_brand', {}, ctx())
    const text = (r.content[0] as { text: string }).text
    expect(text).toContain('hub')
    expect(text).toContain('scene')
    expect(text).toContain('Lora')
  })

  it('forge_stylize validates the pack and returns a docx resource', async () => {
    const r = await handleTool(
      'forge_stylize',
      {
        kind: 'memo',
        theme: 'hub',
        title: 'Test Memo',
        body: [
          { type: 'para', text: 'hello' },
          {
            type: 'evidence',
            claim: 'market size',
            value: '$1.68B',
            source: 'Mordor',
            verified: '2026-09-23',
          },
        ],
      },
      ctx(),
    )
    expect(r.isError).toBeUndefined()
    expect(r.content[1]).toMatchObject({ type: 'resource' })
    const res = r.content[1] as { resource: { mimeType: string; blob: string } }
    expect(res.resource.mimeType).toContain('wordprocessingml')
    expect(res.resource.blob.length).toBeGreaterThan(0)
  })

  it('forge_stylize rejects a malformed pack', async () => {
    await expect(handleTool('forge_stylize', { kind: 'memo' }, ctx())).rejects.toThrow()
  })

  it('forge_compile routes to the base renderer', async () => {
    const r = await handleTool(
      'forge_compile',
      { kind: 'letter', title: 'Hi', body: [{ type: 'para', text: 'body' }] },
      ctx(),
    )
    expect(r.isError).toBeUndefined()
    expect(r.content[1]).toMatchObject({ type: 'resource' })
  })

  it('unknown tool returns isError', async () => {
    const r = await handleTool('nope', {}, ctx())
    expect(r.isError).toBe(true)
  })
})

describe('PackSchema', () => {
  it('accepts all body item types', () => {
    const ok = PackSchema.parse({
      kind: 'report',
      theme: 'scene',
      title: 'R',
      body: [
        { type: 'h1', text: 'A' },
        { type: 'h2', text: 'B' },
        { type: 'para', text: 'C' },
        { type: 'bullet', text: 'D' },
        { type: 'numbered', text: 'E' },
        { type: 'affects', text: 'F' },
        { type: 'evidence', claim: 'c', source: 's', verified: '2026-09-23' },
        { type: 'timeline', entries: [{ date: 'd', event: 'e' }] },
      ],
    })
    expect(ok.body.length).toBe(8)
  })

  it('rejects an unknown body type', () => {
    expect(() =>
      PackSchema.parse({ kind: 'memo', title: 'T', body: [{ type: 'weird', text: 'x' }] }),
    ).toThrow()
  })
})