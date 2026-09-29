import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer, type Server } from 'node:http'
import { api } from '../../src/lib/api'

// Mock the forge worker serving the real contract shape.
const brand = {
  colors: { accent: 'oklch(0.62 0.16 235)' },
  themes: { ocean: 'Ocean', volt: 'Volt' },
  type: { h1: 32 },
  entity: { name: 'P31 Labs', ein: '42-1888158', city: 'Atlanta', website: 'p31ca.org' },
  social: {},
}
const channels = { channels: [{ id: 'discord', name: 'Discord', configured: true }] }
const activity = {
  entries: [{ id: 'a1', kind: 'compile', ts: new Date().toISOString(), summary: 'compiled a pack' }],
}
const info = { name: 'p31-forge', version: '1.0.0', endpoints: ['/brand', '/channels', '/activity', '/compile'] }

let server: Server
let port: number

beforeAll(async () => {
  server = createServer((req, res) => {
    res.setHeader('content-type', 'application/json')
    if (req.url === '/') res.end(JSON.stringify(info))
    else if (req.url === '/health') res.end(JSON.stringify({ status: 'ok', version: '1.0.0' }))
    else if (req.url === '/brand') res.end(JSON.stringify(brand))
    else if (req.url === '/channels') res.end(JSON.stringify(channels))
    else if (req.url?.startsWith('/activity')) res.end(JSON.stringify(activity))
    else {
      res.statusCode = 404
      res.end(JSON.stringify({ error: 'not found' }))
    }
  })
  await new Promise<void>((r) => server.listen(0, r))
  port = (server.address() as { port: number }).port
  // Point the api client at the mock. Vitest loads the module once; the base
  // is read at call time from env, so mutate before first call.
  process.env.VITE_FORGE_API = `http://127.0.0.1:${port}`
})

afterAll(() => {
  server.close()
})

describe('forge api client', () => {
  it('reads /brand', async () => {
    const d = await api.brand()
    expect(d.entity.name).toBe('P31 Labs')
  })

  it('reads /channels', async () => {
    const d = await api.channels()
    expect(d.channels[0]?.configured).toBe(true)
  })

  it('reads /activity', async () => {
    const d = await api.activity()
    expect(d.entries[0]?.kind).toBe('compile')
  })

  it('reads / (info)', async () => {
    const d = await api.info()
    expect(d.version).toBe('1.0.0')
  })
})