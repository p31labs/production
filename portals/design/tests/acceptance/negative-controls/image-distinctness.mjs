#!/usr/bin/env node
/**
 * Negative control: image-distinctness must FAIL when s0 == s3 (crisis boundary
 * collapsed). Mutates the real baseline dir by copying s0 over s3, runs the
 * real checker against it, asserts non-zero, and restores the real s3.
 *
 * Exits 0 iff the checker correctly fails on the collapsed boundary.
 * The real baseline is restored before any process.exit (process.exit skips finally).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

const realDir = resolve(import.meta.dirname, '..', '__screenshots__', 'acceptance-freeze.spec.ts');
const s0 = readFileSync(join(realDir, 'catalog-ocean-s0.png'));
const s3 = readFileSync(join(realDir, 'catalog-ocean-s3.png'));

const checker = resolve(import.meta.dirname, '..', 'check-image-distinctness.mjs');
let exit;
try {
  writeFileSync(join(realDir, 'catalog-ocean-s3.png'), s0); // collapse
  try {
    execSync(`node ${checker}`, { stdio: 'pipe', timeout: 20000 });
    exit = 0; // checker PASSED on collapsed — furniture
  } catch (e) {
    exit = e.status ?? 1;
  }
} finally {
  writeFileSync(join(realDir, 'catalog-ocean-s3.png'), s3); // restore real baseline
}

if (exit === 0) {
  console.error('image-distinctness PASSED with s0==s3 — cannot detect boundary collapse.');
  process.exit(1);
}
console.log('image-distinctness correctly failed on the collapsed boundary. Restored real baseline.');
console.log('NEGATIVE_CONTROL_OK');
process.exit(0);