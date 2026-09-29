#!/usr/bin/env node
/**
 * Negative control for the forge system-test gate (Phase 4 — token-audit).
 *
 * Proves the canonical token-audit gate can FAIL on a raw hex literal. Builds
 * a scratch tree with src/raw-hex.ts containing #ff00ff, runs the REAL
 * design-core token-audit with cwd = scratch, and asserts it exits non-zero.
 *
 * A gate that only mentions the hex regex in its source cannot prove it
 * rejects a literal — this control forces the real scanner to fail on one.
 *
 * STRONG CONTRACT: exits 0 + emits NEGATIVE_CONTROL_OK iff the gate failed
 * on the fixture. If the gate passed (raw hex allowed), exits 1.
 */
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { execSync } from 'node:child_process'

const gate = resolve('/home/p31/P31-local-workspace/packages/design-core/scripts/token-audit.mjs')
const tmp = mkdtempSync(join(tmpdir(), 'forge-token-audit-nc-'))

let failed = true
try {
  const src = join(tmp, 'src')
  mkdirSync(src, { recursive: true })
  writeFileSync(join(src, 'raw-hex.ts'), 'export const accent = "#ff00ff";\n')

  try {
    execSync(`node ${gate}`, { cwd: tmp, stdio: ['ignore', 'pipe', 'pipe'], timeout: 30_000 })
    failed = false // gate passed on raw hex → it cannot fail → furniture
  } catch {
    failed = true // gate correctly rejected the raw hex
  }
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

if (!failed) {
  console.error('token-audit PASSED on a raw hex literal — the gate cannot fail, so it is furniture.')
  process.exit(1)
}
console.log('token-audit correctly failed on a raw hex fixture (canonical scanner proven).')
console.log('NEGATIVE_CONTROL_OK')