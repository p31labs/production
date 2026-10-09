#!/usr/bin/env node
/**
 * check-p31-scope.mjs — the npm scope migration gate.
 *
 * The original npm account ("@p31" scope) was lost; the replacement scope is
 * "@p31ca". This fails the build if any old-scope reference remains outside
 * the archive (which keeps the old names as historical record) and the
 * migration plan doc (which describes the old scope on purpose).
 *
 * The old scope is the 5-char sequence: at-sign, p, 3, 1, slash. The new
 * scope does NOT contain that sequence (its characters are at-sign p 3 1 c a
 * slash), so a plain grep isolates the old scope — no lookahead needed.
 */
import { execSync } from 'node:child_process';

const OLD = '@p31' + '/';
const EXCLUDE = [
  'node_modules', 'archive', 'dist', '.baseline', '.turbo', '.wrangler',
  'docs/enterprise/npm-scope-migration.md', '*.tgz', '*.bundle', '*.log',
];

const args = EXCLUDE.map(g => `-g '!${g}'`).join(' ');
let out = '';
try {
  out = execSync(
    `rg -n --no-ignore ${args} -F "${OLD}" . 2>/dev/null`,
    { maxBuffer: 10 * 1024 * 1024 }
  ).toString().trim();
} catch (e) {
  // rg exits 1 when there are no matches — that is the PASS case.
  if (e.status === 1) {
    console.log('✅ scope:p31-migrated: no old-scope references.');
    process.exit(0);
  }
  throw e; // exit 2 = real rg error
}

if (out) {
  console.error('✗ scope:p31-migrated: old-scope references remain:');
  console.error(out.split('\n').slice(0, 20).join('\n'));
  process.exit(1);
}
console.log('✅ scope:p31-migrated: no old-scope references.');