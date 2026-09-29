#!/usr/bin/env node
/**
 * Negative control for the forge system-test gate.
 *
 * Proves the system test can FAIL on two failure classes, using the REAL
 * system-test functions (imported, not reimplemented) with no mutation of
 * real files:
 *
 *   1. Manifest integrity — phaseManifest() with a temp fixture manifest
 *      whose pack source points at a missing file must THROW (phantom pack).
 *   2. Fail-closed — when the esbuild loader resolves to no buildSync, the
 *      phase MUST throw, not silently skip. This is the P0 regression: a
 *      phase that no-ops on a missing dependency and reports success is a
 *      gate that can pass without testing.
 *
 * STRONG CONTRACT: exits 0 + emits NEGATIVE_CONTROL_OK iff BOTH failure
 * classes are caught. Either passing = the system test is furniture.
 */
import { writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import {
  phaseManifest,
  phaseApi,
  phaseStore,
  __setLoadEsbuildForTest,
} from '../../../scripts/system-test.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const tmp = mkdtempSync(join(tmpdir(), 'forge-system-test-nc-'))

let manifestCaught = false
let failClosed = false

try {
  // ── Failure class 1: phantom pack via a temp fixture manifest ──
  const fixture = {
    generatedAt: new Date().toISOString(),
    contentRoot: tmp, // every source resolves inside the temp dir
    count: 1,
    kinds: ['phantom'],
    packs: [
      { id: 'phantom', kind: 'phantom', title: 'Phantom', filename: 'p.docx', date: null, theme: null, source: 'phantom/does-not-exist.json' },
    ],
  }
  const fixtureManifest = join(tmp, 'fixture-manifest.json')
  writeFileSync(fixtureManifest, JSON.stringify(fixture, null, 2))

  try {
    // Restore the argv override so phaseManifest reads the fixture path.
    process.argv.push('--manifest', fixtureManifest)
    phaseManifest()
    // did not throw → manifest integrity accepted a phantom pack
  } catch (e) {
    manifestCaught = /packs missing on disk/.test(String(e.message))
  }

  // ── Failure class 2: fail-closed when esbuild is unavailable ──
  // Inject a loader that returns no buildSync (simulates esbuild missing).
  // phaseApi/phaseStore must THROW, not return a success skip.
  __setLoadEsbuildForTest(async () => ({ buildSync: null }))
  let apiThrew = false
  try {
    // phaseApi spins a mock server first; the esbuild guard fires after.
    // To isolate the guard, we test the guard path directly via the store
    // phase which has the same guard and no server dependency.
    await phaseStore()
  } catch (e) {
    apiThrew = /esbuild unavailable/.test(String(e.message))
  }
  failClosed = apiThrew

  // Also assert the api phase's guard is the same fail-closed shape.
  if (failClosed) {
    try {
      await phaseApi()
      failClosed = false // api phase did NOT throw on missing esbuild
    } catch (e) {
      failClosed = /esbuild unavailable/.test(String(e.message))
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

if (!manifestCaught) {
  console.error('system-test PASSED on a phantom-pack manifest — manifest integrity cannot fail, so it is furniture.')
  process.exit(1)
}
if (!failClosed) {
  console.error('system-test did NOT fail when esbuild was unavailable — a phase silently no-oped (fail-open).')
  process.exit(1)
}
console.log('system-test caught both: phantom-pack manifest (manifest integrity) + missing-esbuild (fail-closed).')
console.log('NEGATIVE_CONTROL_OK')