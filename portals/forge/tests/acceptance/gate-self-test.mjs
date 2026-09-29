#!/usr/bin/env node
/**
 * gate-self-test — the meta-gate (P2). "Who checks the thing that checks."
 *
 * For every gate in the registry, runs the gate's negative control: a fixture
 * or mutation that MUST make the gate exit non-zero. If a gate exits zero on
 * its own negative control, it measured nothing — GATE IS FURNITURE.
 *
 * Each gate's negative control is a self-contained check script in
 * ./negative-controls/<gate-id>.mjs that: (1) builds a known-bad input,
 * (2) runs the gate against it, (3) exits 0 if the gate correctly FAILED
 * (exit != 0), or exits 1 if the gate passed (furniture).
 *
 * Anti-gaming: run this from a base-branch copy so an agent cannot satisfy it
 * by weakening a gate's failure path in the working branch.
 *
 * Optional: --registry <path> overrides which registry file to read. The
 * self-test NC uses this to point at a temp fixture registry instead of
 * mutating the real one (a mutation that also recursively re-runs this
 * meta-gate is a restore bug waiting to happen).
 */
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const here = resolve(import.meta.dirname);
const registryArgIdx = process.argv.indexOf('--registry');
const registryPath = registryArgIdx !== -1 && process.argv[registryArgIdx + 1]
  ? resolve(here, process.argv[registryArgIdx + 1])
  : resolve(here, 'gates.json');
const registry = JSON.parse(readFileSync(registryPath, 'utf8'));

let furniture = 0;
let missing = 0;

for (const gate of registry.gates) {
  const nc = gate.negativeControl;
  if (!nc) {
    console.error(`✗ ${gate.id}: NO NEGATIVE CONTROL — a gate without one cannot prove it fails.`);
    furniture++;
    continue;
  }

  const checkScript = nc.command
    ? resolve(here, nc.command)
    : resolve(here, 'negative-controls', `${gate.id}.mjs`);
  if (!existsSync(checkScript)) {
    console.error(`✗ ${gate.id}: negative-control script missing: ${checkScript}`);
    missing++;
    continue;
  }

  const start = Date.now();
  let exit, output;
  try {
    output = execSync(`node ${checkScript}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 });
    exit = 0; // the check script exited 0 = the gate FAILED correctly = good
  } catch (e) {
    exit = e.status ?? 1;
    output = e.stdout?.toString() ?? '';
  }
  const ms = Date.now() - start;

  if (exit === 0) {
    console.log(`  ✓ ${gate.id}: negative control proves the gate fails (${ms}ms).`);
  } else {
    console.error(`✗ ${gate.id}: GATE IS FURNITURE or negative control broken (exit ${exit}).`);
    console.error(`  ${output.slice(0, 200)}`);
    furniture++;
  }
}

if (missing) console.error(`\n  ${missing} negative-control script(s) missing.`);
if (furniture) {
  console.error(`\n✗ GATE SELF-TEST: ${furniture} gate(s) are furniture or unproven.`);
  process.exit(1);
}
console.log(`\n✅ GATE SELF-TEST: ${registry.gates.length} gates proven able to fail.`);