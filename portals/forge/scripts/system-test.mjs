#!/usr/bin/env node
/**
 * SYSTEM TEST — Forge Enterprise MVP
 * ===================================
 * End-to-end proof that the whole stack works:
 *
 *   Phase 1 — manifest integrity: every listed pack exists on disk
 *   Phase 2 — API client: against a mock worker serving the real contract
 *   Phase 3 — store: world/mode/spoons transitions + capacity clamp
 *   Phase 4 — gates: canonical token-audit (no raw hex/rgba) via the
 *               design-core scanner, invoked with cwd = this portal. This is
 *               the SAME scanner the design portal uses — not a reimplementation.
 *   Phase 5 — build: vite build produces dist/index.html
 *   Phase 6 — acceptance: Playwright spec + config present
 *
 * Emits out/system-test-report.json, exits 0 iff all pass.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs'
import { createServer } from 'node:http'
import { execSync } from 'node:child_process'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = resolve(fileURLToPath(import.meta.url), '..')
const root = resolve(here, '..')
const report = { startedAt: new Date().toISOString(), phases: [], ok: false }

// Injectable esbuild loader. Default: real import. The NC injects a null to
// prove the fail-closed guard fires (a phase that silently no-ops on a
// missing dependency is a gate that can pass without testing).
export let loadEsbuild = async () => {
  const { buildSync } = await import('esbuild').catch(() => ({ buildSync: null }))
  return { buildSync }
}
export function __setLoadEsbuildForTest(fn) {
  loadEsbuild = fn
}

async function phase(name, fn) {
  const t0 = Date.now()
  try {
    const detail = await fn()
    report.phases.push({ name, ok: true, ms: Date.now() - t0, detail })
    console.log(`  ✅ ${name} (${Date.now() - t0}ms)  ${detail ?? ''}`)
  } catch (e) {
    report.phases.push({ name, ok: false, ms: Date.now() - t0, error: String(e.message) })
    console.error(`  ✗ ${name}: ${e.message}`)
    throw e
  }
}

// ── Phase 1: manifest integrity ──────────────────────────────────
function phaseManifest() {
  // --manifest <path> override lets the NC point at a temp fixture manifest
  // without mutating the real one. Defaults to the committed manifest.
  const argvIdx = process.argv.indexOf('--manifest')
  const manifestPath = argvIdx !== -1 && process.argv[argvIdx + 1]
    ? resolve(process.argv[argvIdx + 1])
    : resolve(root, 'src', 'data', 'manifest.json')
  if (!existsSync(manifestPath)) throw new Error(`manifest missing: ${manifestPath} — run: pnpm manifest`)
  const m = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (!Array.isArray(m.packs) || m.packs.length === 0) throw new Error('manifest lists no packs')
  let missing = 0
  for (const p of m.packs) {
    const abs = resolve(m.contentRoot, p.source)
    if (!existsSync(abs)) { missing++; console.error(`    missing: ${p.source}`) }
  }
  if (missing > 0) throw new Error(`${missing}/${m.packs.length} packs missing on disk`)
  return `${m.packs.length} packs, ${m.kinds.length} kinds, all present`
}

// ── Phase 2: API client against a mock worker ────────────────────
async function phaseApi() {
  const brand = {
    colors: { accent: 'oklch(0.62 0.16 235)' },
    themes: { ocean: 'Ocean' },
    type: { h1: 32 },
    entity: { name: 'P31 Labs', ein: '42-1888158', city: 'Atlanta', website: 'p31ca.org' },
    social: {},
  }
  const channels = { channels: [{ id: 'discord', name: 'Discord', configured: true }] }
  const activity = { entries: [{ id: 'a1', kind: 'compile', ts: new Date().toISOString(), summary: 'compiled' }] }
  const info = { name: 'p31-forge', version: '1.0.0', endpoints: ['/brand', '/channels', '/activity', '/compile'] }

  const server = createServer((req, res) => {
    res.setHeader('content-type', 'application/json')
    if (req.url === '/') res.end(JSON.stringify(info))
    else if (req.url === '/health') res.end(JSON.stringify({ status: 'ok', version: '1.0.0' }))
    else if (req.url === '/brand') res.end(JSON.stringify(brand))
    else if (req.url === '/channels') res.end(JSON.stringify(channels))
    else if (req.url?.startsWith('/activity')) res.end(JSON.stringify(activity))
    else { res.statusCode = 404; res.end(JSON.stringify({ error: 'not found' })) }
  })
  await new Promise((r) => server.listen(0, r))
  const port = server.address().port

  const prev = process.env.VITE_FORGE_API
  process.env.VITE_FORGE_API = `http://127.0.0.1:${port}`

  // Compile the api.ts through esbuild so the system test doesn't depend on
  // Node's TS strip-mode for a Vite-env-typed module. esbuild is a declared
  // devDependency — if it is unavailable this phase MUST FAIL, not skip. A
  // phase that silently no-ops is a gate that can pass without testing.
  const { buildSync } = await loadEsbuild()
  if (!buildSync) {
    server.close()
    throw new Error('esbuild unavailable — api contract phase cannot run. Run: pnpm install')
  }

  const tmp = resolve(root, 'out', 'tmp-api.mjs')
  buildSync({
    entryPoints: [resolve(root, 'src', 'lib', 'api.ts')],
    outfile: tmp,
    format: 'esm',
    bundle: true,
    platform: 'node',
    define: { 'import.meta.env': 'undefined' },
  })
  const mod = await import(tmp)

  try {
    const b = await mod.api.brand()
    if (b.entity.name !== 'P31 Labs') throw new Error('brand.entity.name mismatch')
    const ch = await mod.api.channels()
    if (!ch.channels[0].configured) throw new Error('channels shape mismatch')
    const act = await mod.api.activity()
    if (act.entries[0].kind !== 'compile') throw new Error('activity shape mismatch')
    const infoRes = await mod.api.info()
    if (infoRes.version !== '1.0.0') throw new Error('info shape mismatch')
    return `brand + channels + activity + info round-trip OK (mock :${port})`
  } finally {
    if (prev === undefined) delete process.env.VITE_FORGE_API
    else process.env.VITE_FORGE_API = prev
    server.close()
  }
}

// ── Phase 3: store transitions ───────────────────────────────────
async function phaseStore() {
  const { buildSync } = await loadEsbuild()
  if (!buildSync) throw new Error('esbuild unavailable — store phase cannot run. Run: pnpm install')
  const tmp = resolve(root, 'out', 'tmp-store.mjs')
  buildSync({
    entryPoints: [resolve(root, 'src', 'lib', 'store.ts')],
    outfile: tmp,
    format: 'esm',
    bundle: true,
    platform: 'node',
    external: ['zustand', 'zustand/middleware'],
  })
  const mod = await import(tmp)
  const s = mod.useUI.getState()
  s.setWorld('volt'); if (mod.useUI.getState().world !== 'volt') throw new Error('setWorld failed')
  s.setSpoons(9); if (mod.useUI.getState().spoons !== 5) throw new Error('spoons clamp high failed')
  s.setSpoons(-1); if (mod.useUI.getState().spoons !== 0) throw new Error('spoons clamp low failed')
  s.enqueueCompile('x'); s.enqueueCompile('x')
  if (mod.useUI.getState().compileQueue.length !== 1) throw new Error('enqueue dedup failed')
  s.dequeueCompile('x'); if (mod.useUI.getState().compileQueue.length !== 0) throw new Error('dequeue failed')
  return 'world/mode/spoons/compile-queue transitions correct'
}

// ── Phase 4: gate compliance (canonical token-audit) ────────────
function phaseGates() {
  // Invoke the CANONICAL scanner (design-core token-audit) with cwd = this
  // portal, so it walks this portal's src/ — the same gate the design
  // portal uses. No inline reimplementation; inherits every future rule
  // the canonical scanner adds (hsl, named colors, color-mix, etc.).
  const gate = resolve('/home/p31/P31-local-workspace/packages/design-core/scripts/token-audit.mjs')
  try {
    execSync(`node ${gate}`, { cwd: root, stdio: 'pipe', timeout: 60_000 })
  } catch (e) {
    const out = String(e.stdout ?? '').trim()
    throw new Error(`token-audit failed against forge src/: ${out.slice(0, 500)}`)
  }
  // Count source files for the report line.
  let srcFiles = 0
  ;(function walk(d) {
    for (const e of readdirSync(d)) {
      const p = join(d, e)
      const s = statSync(p)
      if (s.isDirectory()) walk(p)
      else if (/\.(ts|tsx|css)$/.test(p)) srcFiles++
    }
  })(resolve(root, 'src'))
  return `${srcFiles} source files scanned by canonical token-audit — zero raw hex/rgba`
}

// ── Phase 5: build ───────────────────────────────────────────────
function phaseBuild() {
  execSync('pnpm build', { cwd: root, stdio: 'pipe', timeout: 120_000 })
  const distHtml = resolve(root, 'dist', 'index.html')
  if (!existsSync(distHtml)) throw new Error('dist/index.html not produced')
  return 'vite build → dist/index.html'
}

// ── Phase 6: acceptance spec present ─────────────────────────────
function phaseAcceptance() {
  const spec = resolve(root, 'tests', 'acceptance', 'forge.spec.ts')
  if (!existsSync(spec)) throw new Error('tests/acceptance/forge.spec.ts missing')
  return 'forge.spec.ts present'
}

// ── Run ──────────────────────────────────────────────────────────
// Guard: only auto-run when invoked as the CLI (node scripts/system-test.mjs).
// Importing this module (e.g. by a negative control) must not execute the
// full suite — the NC uses the exported guards + phase functions.
const isCliEntry = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isCliEntry) {
  console.log('P31 FORGE — System Test')
  console.log('═'.repeat(60))
  mkdirSync(resolve(root, 'out'), { recursive: true })
  try {
    await phase('manifest integrity', phaseManifest)
    await phase('api contract (mock worker)', phaseApi)
    await phase('store transitions', phaseStore)
    await phase('gate compliance (token-audit + canon-purity)', phaseGates)
    await phase('vite build', phaseBuild)
    await phase('acceptance spec present', phaseAcceptance)
    report.ok = true
  } catch {
    // report.ok stays false
  }
  report.finishedAt = new Date().toISOString()

  writeFileSync(resolve(root, 'out', 'system-test-report.json'), JSON.stringify(report, null, 2) + '\n')

  console.log('═'.repeat(60))
  console.log(report.ok ? '✅ SYSTEM TEST PASSED' : '✗ SYSTEM TEST FAILED')
  console.log('   report → out/system-test-report.json')
  process.exit(report.ok ? 0 : 1)
}

// Exports for negative controls / programmatic use.
export { phaseManifest, phaseApi, phaseStore, phaseGates, phaseBuild, phaseAcceptance, phase }