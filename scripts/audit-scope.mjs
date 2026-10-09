#!/usr/bin/env node
/**
 * audit-scope.mjs — the deterministic scope check.
 *
 * Reads .workspace/scope-lock.json (written by the Orchestrator before the
 * Worker starts). Finds files modified AFTER the scope lock was created
 * (using filesystem mtime). Fails if any modified file is outside the
 * scope lock's allowed paths.
 *
 * Usage: node scripts/audit-scope.mjs
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const LOCK = join(ROOT, '.workspace', 'scope-lock.json');

if (!existsSync(LOCK)) {
  console.log('audit-scope: no scope lock — skipping');
  process.exit(0);
}

const lockRaw = readFileSync(LOCK, 'utf8').replace(/<!--[\s\S]*?-->/, '');
const lock = JSON.parse(lockRaw);
const lockMtime = statSync(LOCK).mtimeMs;

const changed = execSync(
  `find ${ROOT}/scripts ${ROOT}/workers ${ROOT}/portals ${ROOT}/docs ${ROOT}/.workspace -type f -newer ${LOCK} \\( -name "*.ts" -o -name "*.tsx" -o -name "*.mjs" -o -name "*.js" -o -name "*.css" -o -name "*.json" -o -name "*.md" \\) ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*"`,
  { encoding: 'utf8', cwd: ROOT }
)
  .split('\n')
  .filter(Boolean)
  .map((f) => f.replace(/^\.\//, '').replace(/^\/home\/p31\/production\//, '').replace(/^\//, ''));

const violations = changed.filter((f) => !lock.allowed_paths.includes(f));

if (violations.length > 0) {
  console.error(`SCOPE: ${violations.length} file(s) modified outside the lock:`);
  violations.forEach((f) => console.error(`  ${f}`));
  process.exit(1);
}

console.log(`audit-scope: pass — ${changed.length} file(s) modified, all within scope`);
