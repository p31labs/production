#!/usr/bin/env node
/**
 * Negative control: the self-test (meta-gate) must be ABLE to fail.
 *
 * The self-test reads a registry. If the registry contains a gate with NO
 * negative control, the self-test must report GATE IS FURNITURE and exit
 * non-zero. This proves the meta-gate can detect furniture — it is not
 * itself furniture.
 *
 * This NC uses a TEMP FIXTURE registry (via gate-self-test.mjs --registry)
 * instead of mutating the real gates.json. The old mutation approach invoked
 * the full meta-gate against the real registry, which recursively re-ran this
 * NC; the nested run's backup clobbered the outer run's restore and left the
 * real registry corrupted. A fixture registry has no such recursion.
 *
 * The fixture: null the negative control of the first gate that currently has
 * one (real corruption — a gate loses its proof-of-failure), and drop the
 * self-test gate so the meta-gate run cannot re-trigger this NC.
 *
 * Exits 0 (with NEGATIVE_CONTROL_OK) iff the self-test correctly failed.
 */
import { readFileSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';

const here = resolve(import.meta.dirname);
const registryPath = resolve(here, '..', 'gates.json');
const selfTest = resolve(here, '..', 'gate-self-test.mjs');

const real = JSON.parse(readFileSync(registryPath, 'utf8'));

// Find the first gate that currently has an NC (real corruption target).
const idx = real.gates.findIndex((g) => g.negativeControl);
if (idx === -1) {
  console.error('fixture error: no gate currently has a negative control to null.');
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), 'gate-nc-self-test-'));
try {
  // Build the broken fixture registry: null one gate's NC, drop the self-test
  // gate (prevents recursion), keep the rest.
  const brokenGates = real.gates
    .filter((g) => g.id !== 'self-test')
    .map((g, i) => (i === idx ? { ...g, negativeControl: null } : g));
  const fixture = { ...real, gates: brokenGates };
  const fixturePath = join(dir, 'gates.json');
  writeFileSync(fixturePath, JSON.stringify(fixture, null, 2));

  let detectedFurniture = false;
  try {
    execSync(`node ${selfTest} --registry ${fixturePath}`, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 });
    // self-test exited 0 on a broken registry → it cannot detect furniture
  } catch (e) {
    detectedFurniture = true; // self-test correctly failed → it CAN detect furniture
  }

  if (!detectedFurniture) {
    console.error('self-test PASSED on a broken registry (gate with no negative control) — it cannot detect furniture.');
    process.exitCode = 1;
  } else {
    console.log('self-test correctly failed on the broken fixture registry (detected furniture).');
    console.log('NEGATIVE_CONTROL_OK');
  }
} finally {
  // process.exitCode (not process.exit) lets finally run — process.exit skips
  // finally, which is the exact leak bug class this control exists to catch.
  rmSync(dir, { recursive: true, force: true });
}