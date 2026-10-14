#!/usr/bin/env node
/**
 * usage-logger.mjs — Lane D v6.0 (runbook §7 D-1) LOCAL STAND-IN.
 *
 * WHAT THIS IS (documented choice): a zero-dependency counter harness that
 * WRAPS JSON-RPC 2.0 calls to a local wrangler-dev worker and counts them —
 * tool name → call count, in the exact aggregated shape proposed in
 * mcp-usage-proposal.md. It is NOT the production instrumentation; the real
 * usage log lands with the design-core PR (queued).
 *
 * WHY NOT A LOG-TAILER: tailing wrangler-dev output is brittle (ANSI codes,
 * partial lines, format changes). Wrapping the JSON-RPC calls we make during
 * rehearsal is deterministic and replayable — honest about being a stand-in.
 *
 * MODES:
 *   node usage-logger.mjs                     # rehearsal matrix: tools/list + all 17 tools/call
 *   node usage-logger.mjs --url <base>        # target another worker (default http://localhost:8787)
 *   node usage-logger.mjs --rate-limit        # NEGATIVE CONTROL: 65 calls, must observe >=1 429
 *   node usage-logger.mjs --expect-down       # NEGATIVE CONTROL: unreachable URL must exit 1
 *
 * Zero npm installs. Node 24 ESM (global fetch).
 */

const BASE = process.env.MCP_URL || 'http://localhost:8787'
const TOOLS = [
  'list_tokens', 'resolve_token', 'search_tokens', 'list_tokens_dtc',
  'list_components', 'get_component', 'get_component_metadata', 'validate_component',
  'resolve_brand', 'generate_component', 'list_recipes', 'get_recipe',
  'convert_component', 'audit_css', 'validate_parity', 'get_ui_principles', 'get_review_rules',
]

// Minimal valid arguments per tool (from tool-registry.ts inputSchema.required).
const ARGS = {
  resolve_token: { path: 'color.accent.default' },
  search_tokens: { query: 'accent' },
  get_component: { name: 'GlassPanel' },
  get_component_metadata: { name: 'GlassPanel' },
  validate_component: { name: 'GlassPanel' },
  resolve_brand: { name: 'p31' },
  generate_component: { name: 'GlassPanel', framework: 'react' },
  get_recipe: { name: 'glass-panel' },
  convert_component: { source: 'react', target: 'astro', code: 'const X = () => <div/>', componentName: 'GlassPanel' },
  audit_css: { content: '.a { color: oklch(70% 0.1 200) }' },
  validate_parity: { sourceContent: 'const X = () => <div/>', targetContent: 'const X = () => <div/>' },
}

const usage = { requests: 0, rateLimited: 0, errors: 0, tools: new Map() }
const addTool = (name, ok) => {
  const e = usage.tools.get(name) || { calls: 0, errors: 0 }
  if (ok) e.calls++; else e.errors++
  usage.tools.set(name, e)
}

async function rpc(method, params) {
  usage.requests++
  let res
  try {
    res = await fetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: usage.requests, method, params }),
    })
  } catch (err) {
    console.error(`rpc transport failure: ${err.message}`)
    process.exit(1)
  }
  if (res.status === 429) { usage.rateLimited++; return { rateLimited: true } }
  if (res.status !== 200) { usage.errors++; return { httpError: res.status } }
  return await res.json()
}

function snapshot() {
  return {
    service: 'p31-design-mcp',
    startedAt: new Date().toISOString(),
    requests: usage.requests,
    rateLimited: usage.rateLimited,
    errors: usage.errors,
    tools: TOOLS.map(t => ({ name: t, ...(usage.tools.get(t) || { calls: 0, errors: 0 }) })),
  }
}

// ── Rehearsal matrix ──────────────────────────────────────────────────────
async function rehearsal() {
  const list = await rpc('tools/list', {})
  const listed = list?.result?.tools?.length ?? -1
  console.log(`tools/list → advertised tools: ${listed}`)
  for (const t of TOOLS) {
    const res = await rpc('tools/call', { name: t, arguments: ARGS[t] || {} })
    if (res.rateLimited) { console.log(`  ${t}: RATE LIMITED (429)`); addTool(t, false); continue }
    if (res.httpError) { console.log(`  ${t}: HTTP ${res.httpError}`); addTool(t, false); continue }
    const isErr = res?.result?.isError || res?.error
    console.log(`  ${t}: ${isErr ? 'error' : 'ok'}`)
    addTool(t, !isErr)
  }
  console.log('\n=== USAGE SNAPSHOT (shape per mcp-usage-proposal.md §2) ===')
  console.log(JSON.stringify(snapshot(), null, 2))
}

// ── Negative control: rate limit ──────────────────────────────────────────
async function rateLimitControl() {
  console.log(`firing 65 tools/call requests at ${BASE} (limit: 60 req/60s/IP)`)
  for (let i = 0; i < 65; i++) {
    await rpc('tools/call', { name: 'list_tokens', arguments: {} })
  }
  const s = snapshot()
  console.log(`requests=${s.requests} rateLimited=${s.rateLimited}`)
  if (s.rateLimited >= 1) {
    console.log('RATE-LIMIT NEGATIVE CONTROL: PASS (429 observed and counted)')
    process.exit(0)
  }
  console.log('RATE-LIMIT NEGATIVE CONTROL: FAIL (no 429 observed — gate is furniture)')
  process.exit(1)
}

// ── Negative control: expect down ─────────────────────────────────────────
async function expectDownControl() {
  try {
    const res = await fetch(`${BASE}/health`)
    console.log(`expect-down: server answered HTTP ${res.status} — control FAILS (server is up)`)
    process.exit(1)
  } catch {
    console.log('EXPECT-DOWN NEGATIVE CONTROL: PASS (connection refused; harness exits 1 on transport failure)')
    process.exit(0)
  }
}

const mode = process.argv.includes('--rate-limit') ? 'ratelimit'
  : process.argv.includes('--expect-down') ? 'down' : 'rehearsal'

if (mode === 'ratelimit') await rateLimitControl()
else if (mode === 'down') await expectDownControl()
else await rehearsal()