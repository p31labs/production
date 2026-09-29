#!/usr/bin/env node
/**
 * gate — the forge portal's acceptance chain.
 * Runs: typecheck → unit → build → system-test.
 * Exits non-zero on the first failure. Emits out/gate-report.json.
 */
import { execSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(import.meta.url), '..', '..')
const steps = [
  ['typecheck', 'pnpm typecheck'],
  ['unit', 'pnpm test'],
  ['build', 'pnpm build'],
  ['system', 'pnpm system-test'],
]
const report = { startedAt: new Date().toISOString(), steps: [] }
let ok = true
for (const [name, cmd] of steps) {
  const t0 = Date.now()
  try {
    execSync(cmd, { cwd: root, stdio: 'inherit' })
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