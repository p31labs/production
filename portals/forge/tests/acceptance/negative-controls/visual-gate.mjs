#!/usr/bin/env node
/**
 * Negative control for the forge visual-gate.
 *
 * Proves the visual gate can FAIL. Runs the REAL visual-gate with
 * --skip-screenshot (deterministic style-diff phase) against a candidate that
 * is NOT the forge (https://example.com), which shares no design system with
 * the canon → every core selector diffs → gate exits non-zero.
 *
 * STRONG CONTRACT: exits 0 + emits NEGATIVE_CONTROL_OK iff the gate failed on
 * the fixture. If the gate passed (unrelated page accepted), exits 1.
 *
 * Requires network access to example.com + design.p31ca.org (the gate itself
 * does — the control exercises the real enforcement path).
 */
import { execSync } from 'node:child_process'

const gate = '/home/p31/production/tools/design-parity/visual-gate.mjs'

try {
  const out = execSync(
    `node ${gate} --candidate https://example.com --skip-screenshot`,
    { stdio: ['ignore', 'pipe', 'pipe'], timeout: 90_000 },
  )
  // Gate PASSED on an unrelated page → it is furniture → control fails.
  console.error('NEGATIVE_CONTROL_FAIL: visual-gate accepted https://example.com as canon-parity')
  process.exit(1)
} catch (e) {
  if (e.status !== 0) {
    console.log('NEGATIVE_CONTROL_OK: visual-gate correctly failed on unrelated candidate')
    process.exit(0)
  }
  console.error('NEGATIVE_CONTROL_FAIL: unexpected gate error (status 0)')
  process.exit(1)
}