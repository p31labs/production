#!/usr/bin/env node
/**
 * @p31ca/canon — check-derived-names.mjs
 *
 * The Loom names roles, never people or models — and never a raw identifier.
 * `check-no-agent-names.mjs` keeps model/vendor names out. THIS gate keeps raw
 * identity names out of chain writes: any `statedBy` or `author` assigned a
 * string literal that is NOT a pickle code name (contains the `·` separator,
 * e.g. "Dill·ember") fails. The only allowed forms:
 *
 *   statedBy: codename('role-seed')   ← derived pseudonym (the seed is local)
 *   statedBy: 'Dill·ember'            ← a literal pickle name
 *   statedBy: someVariable            ← a variable (caller-owned derivation)
 *
 * A raw literal — 'guardian', 'lumi', 'alice', 'loom-enforcement-guard',
 * 'duet-agent' — is doctrine drift: it leaks an identity handle into the
 * append-only audit chain. The gate fails on it.
 *
 * Not gated: `humanId`. A personal event carries the raw identity BY DESIGN
 * (the log is scoped to that human, bound via Access). A shared event never
 * does — the gate strips humanId at write time (normalizeLegacyScope). So a
 * raw humanId in a personal-scope fixture is intentional, not a leak.
 *
 * Run from packages/canon: node scripts/check-derived-names.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..', '..');

const SCAN_DIRS = [
  join(repo, 'packages', 'canon', 'src', 'loom'),
  join(repo, 'packages', 'canon', 'scripts'),
  join(repo, 'packages', 'canon-mcp', 'src'),
  join(repo, 'apps', 'loom'),
  // LUMI's classifier + the LedController GO handler — the future chain-write
  // surface. Unscanned surfaces drift; scan them before a write path lands.
  join(repo, 'apps', 'p31ca', 'src'),
  // The portals — Wave 3 adds a placeBlock write path here (via canon-mcp or
  // directly to /api/loom/event). Scan before the doctrine can be violated.
  join(repo, 'production', 'portals', 'forge', 'src'),
  join(repo, 'production', 'portals', 'design', 'src'),
];
// --scan <dir> lets the negative control point the gate at a fixture tree.
const scanArgIdx = process.argv.indexOf('--scan');
if (scanArgIdx !== -1 && process.argv[scanArgIdx + 1]) {
  SCAN_DIRS.push(resolve(process.argv[scanArgIdx + 1]));
}
const EXTS = /\.(ts|tsx|mjs|js)$/;
const IGNORED = new Set(['worker-configuration.d.ts', 'check-derived-names.mjs', 'nc-derived-names.mjs']);

// statedBy / author / agent / parentAgent followed by a string literal. These
// are the Loom's identity-carrying fields (statedBy + author on human/agent
// writes, agent on the review kind, parentAgent on propose/review). We flag
// the QUOTED literals that are not pickle names. The lookbehind skips property
// access (`e.statedBy : '…'` in a ternary — a display fallback, not an
// assignment). 'unknown' + '' are the documented omitted-author sentinels, not
// identities.
const IDENTITY = /(?<!\.|\w)\b(statedBy|author|agent|parentAgent)\s*:\s*("[^"]*"|'[^']*')/g;
const ALLOWED_SENTINELS = new Set(['unknown', '']);

function walk(dir) {
  let out = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git' || e.name === 'test-results' || e.name === 'backup') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(full));
    else if (EXTS.test(e.name)) out.push(full);
  }
  return out;
}

/** A literal pickle name contains the `·` separator (e.g. "Dill·ember"). */
function isPickleName(literal) {
  return literal.includes('·');
}

let bad = 0;
for (const dir of SCAN_DIRS) {
  for (const file of walk(dir)) {
    if (IGNORED.has(file.split('/').pop())) continue;
    const src = readFileSync(file, 'utf8');
    // Strip comments (the doctrine lives in comments too — but a commented
    // example is not a chain write; only live assignments matter here).
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].replace(/\/\/.*$/, '');
      for (const m of line.matchAll(IDENTITY)) {
        const field = m[1];
        const literal = m[2].replace(/^["']|["']$/g, '');
        if (ALLOWED_SENTINELS.has(literal)) continue;
        if (!isPickleName(literal)) {
          console.error(`✗ derived-names: ${file.split('/').slice(-3).join('/')}:${i + 1} — ${field} assigned raw identity '${literal}'. Use codename('…') or a pickle name ('Name·name').`);
          bad++;
        }
      }
    }
  }
}

if (bad > 0) {
  console.error(`\n✗ check-derived-names FAILED — ${bad} raw identity literal(s). The chain must never expose an identity handle.`);
  process.exit(1);
}
console.log('✅ derived-names — every statedBy/author in chain writes is a pickle name or codename().');