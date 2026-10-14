import { describe, it, expect } from 'vitest'
import { probeExternalServer, callToolDirect } from '@/lib/mcpWire'

/**
 * LIVE negative-control probes (B-2/C) — run only when RUN_LIVE_NC=1, since
 * they hit the real network:
 *   RUN_LIVE_NC=1 pnpm test -- liveProbe
 *
 * 1. A live P31 MCP endpoint probes to `ok` with real tool schemas.
 * 2. A dead URL degrades to `dead` with an error detail — never throws.
 * 3. A non-MCP web page degrades gracefully — never throws.
 * 4. A direct tool call against the live endpoint returns JSON-RPC text.
 */
const RUN = process.env.RUN_LIVE_NC === '1'

const LIVE_URL = 'https://p31-crypto-mcp.trimtab-signal.workers.dev/mcp'
const DEAD_URL = 'http://127.0.0.1:1/mcp'
const NOT_MCP = 'https://example.com/'

describe.skipIf(!RUN)('live negative controls (network)', () => {
  it('probes a live external MCP endpoint to ok with real tools', async () => {
    const r = await probeExternalServer(LIVE_URL)
    expect(r.status).toBe('ok')
    expect(r.serverInfo?.name).toBeTruthy()
    expect((r.tools ?? []).length).toBeGreaterThan(0)
    expect(r.tools?.[0]).toHaveProperty('name')
    expect(r.tools?.[0]).toHaveProperty('inputSchema')
  }, 40_000)

  it('degrades a dead URL to dead with an error detail (no crash)', async () => {
    const r = await probeExternalServer(DEAD_URL)
    expect(r.status).toBe('dead')
    expect(r.error).toBeTruthy()
    expect(r.tools).toBeUndefined()
  }, 40_000)

  it('degrades a non-MCP web page gracefully (no crash)', async () => {
    const r = await probeExternalServer(NOT_MCP)
    expect(r.status).not.toBe('ok')
    expect(r.error).toBeTruthy()
  }, 40_000)

  it('runs a direct stateless tool call against the live endpoint', async () => {
    const res = await callToolDirect(LIVE_URL, 'pqc_keygen', { algorithm: 'ML-DSA-65' })
    expect(res.error).toBeUndefined()
    expect(res.text.length).toBeGreaterThan(0)
    expect(res.requestBody).toContain('"method":"tools/call"')
  }, 40_000)
})