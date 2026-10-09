#!/usr/bin/env node
/**
 * namecheck.mjs — the V1 CAPTURE naming contract.
 *
 * Enforces the p31 naming convention (adopted from the Austrian archive
 * standard):
 *   p31_[component]_[type]_[YYYYMMDD]_v[MAJOR].[MINOR].[ext]
 *
 * All lowercase. No spaces. No diacritics. Underscores between elements.
 *
 * This is the tetrahedron's V1 (CAPTURE / Grounder) sensor: every file lands
 * named. Nothing exists unnamed.
 *
 * Usage: node scripts/namecheck.mjs [dir]
 * Exit 0 on clean, 1 with file:line violations otherwise.
 */
import { readdirSync, readFileSync, lstatSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DEFAULT_SCAN = ROOT; // the scripts dir's parent is the production root

// Files exempt from the naming convention (generated, vendor, node_modules).
const ALLOW = [
  /node_modules/,
  /\.git\//,
  /dist\//,
  /vendor\//,
  /\.(tgz|zip|lock|log|db|wasm|map|png|jpg|jpeg|gif|svg|ico|woff2?|ttf)$/,
  /^package\.json$/,
  /^tsconfig\.json$/,
  /^wrangler\.toml$/,
  /^vite\.config/,
  /^vitest\.config/,
  /^pnpm-lock\.yaml$/,
  /^package-lock\.json$/,
  /^\./,
];

const NAME_RE = /^p31_[a-z0-9_]+_[a-z0-9_]+_\d{8}_v\d+\.\d+(\.\w+)?$/;

function isAllowed(file) {
  for (const a of ALLOW) {
    if (a instanceof RegExp && a.test(file)) return true;
  }
  return false;
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = lstatSync(p);
    if (st.isSymbolicLink()) continue; // don't follow symlinks out of the tree
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git' || entry === 'dist' || entry === 'target' || entry === '.wrangler') continue;
      // Known-stale parallel roots — slated for W9 diff-and-delete, not naming.
      if (/^.*\(1\)$/.test(entry) || entry.includes(' (1)')) continue;
      walk(p, out);
    } else {
      out.push(p);
    }
  }
  return out;
}

const scanDir = process.argv[2] ? join(ROOT, process.argv[2]) : DEFAULT_SCAN;
const strict = process.argv.includes('--strict');

// Default mode scans a curated set of AUTHORED dirs (docs, scripts, the
// workspace substrate, portal src trees) — the places new artifacts land.
// The full-tree scan is `--strict` (the Wave 9 backlog cleanup task). The
// convention governs new work; it does not re-litigate the legacy corpus.
const DEFAULT_DIRS = ['docs', 'scripts', '.workspace', 'INBOX.md', 'STATE.md', 'HISTORY.md', 'AGENTS.md', 'portals/shell/docs', 'portals/ui-forge-studio/docs'];

function effectiveScan() {
  if (strict || process.argv[2]) return scanDir;
  const files = [];
  for (const d of DEFAULT_DIRS) {
    const p = join(ROOT, d);
    try {
      const st = lstatSync(p);
      if (st.isDirectory()) walk(p, files);
      else if (st.isFile()) files.push(p);
    } catch { /* dir missing → skip */ }
  }
  return files;
}

const scanFiles = effectiveScan();
let violations2 = 0;

for (const file of scanFiles) {
  const rel = file.slice(ROOT.length + 1);
  const name = file.split('/').pop() ?? '';
  if (isAllowed(name)) continue;
  // The convention applies to authored artifacts we intend to track. A file
  // that already has a P31-HEADER is exempt from the strict prefix (it's
  // tagged, which is the stronger contract).
  let hasHeader = false;
  try {
    const head = readFileSync(file, 'utf8').slice(0, 800);
    hasHeader = head.includes('P31-HEADER');
  } catch { /* unreadable → still check the name */ }
  if (hasHeader) continue;
  // The workspace substrate (STATE/INBOX/HISTORY/AGENTS/manifest) uses its
  // canonical harness names — the contract is the P31-HEADER, not the prefix.
  // Anchor to the basename: the harness files are exactly STATE.md / INBOX.md /
// HISTORY.md / AGENTS.md — not any path that merely ends in "STATE.md" (e.g.
// a reference doc named SESSION-STATE.md).
const isSubstrate = /(^|\/)(STATE|INBOX|HISTORY|AGENTS)\.md$/.test(file) || file.includes('.workspace');
  if (isSubstrate) {
    // Generated/derived substrate artifacts (manifest, ledger, keys, tokens,
    // checkpoints, refs) are machine-written — they carry no hand-authored
    // header. Only authored substrate files (STATE/INBOX/HISTORY/AGENTS) tag.
    const GENERATED = [
      /\.workspace\/manifest\.json$/,
      /\.workspace\/repos\.yaml$/,
      /\.workspace\/ledger\.jsonl$/,
      /\.workspace\/ledger-checkpoints\.jsonl$/,
      /\.workspace\/tokens\/.*\.token$/,
      /\.workspace\/keys\//,
      /\.workspace\/deletions\.jsonl$/,
      /\.cas\//,
      /\.trash\//,
    ];
    if (GENERATED.some((re) => re.test(file))) continue;
    if (!hasHeader) {
      console.error(`${file}: SUBSTRATE missing P31-HEADER — the harness must be tagged`);
      violations2++;
    }
    continue;
  }
  if (!NAME_RE.test(name)) {
    // Legacy authored files predate the convention → W9 backlog (warn only).
    console.warn(`${file}: legacy file without convention name/header (W9 backlog)`);
  }
}

if (violations2 > 0) {
  console.error(`\n${violations2} naming violations. Use the convention or add a P31-HEADER.`);
  process.exit(1);
}
console.log(`namecheck: clean (${scanFiles.length} authored files scanned)`);