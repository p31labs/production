#!/usr/bin/env node
/**
 * Negative control: token-audit must FAIL on a raw hex color literal.
 *
 * Method: fixture-write. The real gate roots its scan at process.cwd() and
 * walks ./src (plus tokens/manifest if present). So we build a scratch tree
 * in a temp dir containing a source file with a hardcoded raw hex (#ff00ff),
 * run the real gate with cwd pointed at the scratch tree, assert it exits
 * non-zero, and remove the scratch tree in `finally`.
 *
 * A gate that only *mentions* the hex/rgba regexes in its source cannot prove
 * it rejects a literal; this control forces the gate to actually fail on one.
 *
 * Exits 0 (with NEGATIVE_CONTROL_OK) iff the real gate fails on the fixture.
 */
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

const gate = resolve('/home/p31/P31-local-workspace/packages/design-core/scripts/token-audit.mjs');
const tmp = mkdtempSync(join(tmpdir(), 'token-audit-nc-'));

let exit = 1;
try {
  const src = join(tmp, 'src');
  mkdirSync(src, { recursive: true });
  writeFileSync(join(src, 'raw-hex.ts'), 'export const accent = "#ff00ff";\n');

  try {
    execSync(`node ${gate}`, { cwd: tmp, stdio: 'pipe', timeout: 20000 });
    exit = 0; // gate PASSED on the raw hex — furniture
  } catch (e) {
    exit = e.status ?? 1;
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (exit === 0) {
  console.error('token-audit PASSED with a raw hex in src — it cannot detect raw literals.');
  process.exit(1);
}
console.log('token-audit correctly failed on a real raw-hex fixture (#ff00ff).');
console.log('NEGATIVE_CONTROL_OK');
process.exit(0);