#!/usr/bin/env node
/**
 * gate — the forge portal's acceptance chain.
 * Runs: typecheck → unit → build → layout → system-test.
 * Exits non-zero on the first failure. Emits out/gate-report.json.
 *
 * `layout` is the structural gate (layout-invariants) against the built
 * portal. It starts a detached vite preview on 5180 if none is running,
 * runs the DOM-geometry invariants across every forge route, then kills the
 * preview it started. A preview it did not start is left alone
 * (reuseExistingServer semantics).
 */
import { execSync, spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(import.meta.url), '..', '..')
const LAYOUT_GATE = '/home/p31/P31-local-workspace/tools/design-parity/layout-invariants.mjs'
const ROUTES = '/,/catalog,/playground,/identity,/compose,/activity,/channels'
const PORT = 5180

function isUp(url) {
  try {
    execSync(`curl -s -o /dev/null -w '%{http_code}' ${url}`, { timeout: 5000 })
    return true
  } catch { return false }
}

function runLayout() {
  const base = `http://localhost:${PORT}`
  let owned = null
  if (!isUp(base)) {
    owned = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
      cwd: root, stdio: 'ignore', detached: true,
    })
    let tries = 0
    while (!isUp(base) && tries++ < 20) execSync('sleep 0.5')
    if (!isUp(base)) throw new Error(`layout gate: preview not reachable on :${PORT}`)
  }
  try {
    execSync(`node ${LAYOUT_GATE} ${base} --routes ${ROUTES}`, { stdio: 'inherit', timeout: 120_000 })
  } finally {
    if (owned) owned.kill('SIGKILL')
  }
}

const steps = [
  ['typecheck', 'pnpm typecheck'],
  ['unit', 'pnpm test'],
  ['build', 'pnpm build'],
  ['fork-gate', 'node /home/p31/P31-local-workspace/tools/canon-audit/canon-source-audit.mjs --target /home/p31/production/portals/forge/src'],
  ['layout', runLayout],
  ['system', 'pnpm system-test'],
]
const report = { startedAt: new Date().toISOString(), steps: [] }
let ok = true
for (const [name, cmd] of steps) {
  const t0 = Date.now()
  try {
    if (typeof cmd === 'function') cmd()
    else execSync(cmd, { cwd: root, stdio: 'inherit' })
    report.steps.push({ name, ok: true, ms: Date.now() - t0 })
  } catch {
    report.steps.push({ name, ok: false, ms: Date.now() - t0 })
    ok = false
    break
  }
}
report.ok = ok
mkdirSync(resolve(root, 'out'), { recursive: true })
writeFileSync(resolve(root, 'out', 'gate-report.json'), JSON.stringify(report, null, 2))
console.log(ok ? '✅ GATE: all steps passed' : '✗ GATE: failed')
process.exit(ok ? 0 : 1)