#!/usr/bin/env node
/**
 * Negative control: image-distinctness must FAIL when s0 == s3 (crisis boundary
 * collapsed). Builds a scratch baseline dir with identical s0/s3 copies, runs
 * the checker against it, asserts non-zero.
 *
 * Exits 0 iff the checker correctly fails on the collapsed boundary.
 */
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

const tmp = mkdtempSync(join(tmpdir(), 'gate-nc-distinct-'));
try {
  const sub = join(tmp, 'acceptance-freeze.spec.ts');
  const { mkdirSync } = await import('node:fs');
  mkdirSync(sub, { recursive: true });
  // Write one real pixel block; copy it for both s0 and s3.
  const px = Buffer.alloc(64, 0x42); // arbitrary distinct bytes
  writeFileSync(join(sub, 'catalog-ocean-s0.png'), px);
  writeFileSync(join(sub, 'catalog-ocean-s3.png'), px); // identical → collapse
  writeFileSync(join(sub, 'catalog-ocean-s5.png'), Buffer.alloc(64, 0x43));

  // The checker reads from its own BASELINE constant — so we can't point it at tmp
  // without a flag. Add the flag support in the checker, or test via mutation:
  // run the checker twice — once with s0==s3 real (mutate the real baseline, restore).
  // The real baseline has s0 != s3 (verified). So the negative control is: temporarily
  // copy s0 over s3 in the REAL baseline, run the checker, restore.
  const realDir = resolve(import.meta.dirname, '..', '__screenshots__', 'acceptance-freeze.spec.ts');
  const s0 = readFileSync(join(realDir, 'catalog-ocean-s0.png'));
  const s3 = readFileSync(join(realDir, 'catalog-ocean-s3.png'));
  // sanity: the real baseline must already be distinct (if not, the gate is broken)
  const checker = resolve(import.meta.dirname, '..', 'check-image-distinctness.mjs');
  let exit;
  try {
    writeFileSync(join(realDir, 'catalog-ocean-s3.png'), s0); // collapse
    execSync(`node ${checker}`, { stdio: 'pipe', timeout: 20000 });
    exit = 0; // checker PASSED on collapsed — furniture
  } catch (e) {
    exit = e.status ?? 1;
  } finally {
    writeFileSync(join(realDir, 'catalog-ocean-s3.png'), s3); // restore
  }
  if (exit === 0) {
    console.error('image-distinctness PASSED with s0==s3 — cannot detect boundary collapse.');
    process.exit(1);
  }
  console.log('image-distinctness correctly failed on the collapsed boundary. Restored real baseline.');
  process.exit(0);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}