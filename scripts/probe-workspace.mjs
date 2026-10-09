#!/usr/bin/env node
/**
 * probe-workspace.mjs — the V2 SORT index generator.
 *
 * Scans the production tree, classifies every top-level dir as
 * live / reference / stale / (1)-duplicate, and writes `.workspace/manifest.json`
 * — the derived state index. Regenerable via `pnpm audit:workspace`.
 *
 * The manifest is DERIVED state — markdown artifacts remain source of truth.
 * It is rebuildable from scratch at any time.
 *
 * Usage: node scripts/probe-workspace.mjs
 */
import { readdirSync, lstatSync, statSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, '.workspace', 'manifest.json');

const LIVE_DIRS = ['portals', 'packages', 'workers', 'apps', 'tools', 'cli', 'software', 'monetization', 'admin', 'shell'];
const STALE_PATTERNS = [/\(1\)$/, /\(2\)$/, /^archive$/, /^backups?$/, /^logs$/];

function classify(name) {
  if (STALE_PATTERNS.some((p) => p.test(name))) return 'stale';
  if (LIVE_DIRS.includes(name)) return 'live';
  return 'reference';
}

function dirSize(dir) {
  let total = 0;
  try {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      const st = lstatSync(p);
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) {
        if (entry === 'node_modules' || entry === '.git' || entry === 'dist' || entry === 'target') continue;
        total += dirSize(p);
      } else {
        total += st.size;
      }
    }
  } catch { /* unreadable */ }
  return total;
}

function humanSize(bytes) {
  if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)}G`;
  if (bytes > 1e6) return `${(bytes / 1e6).toFixed(1)}M`;
  if (bytes > 1e3) return `${(bytes / 1e3).toFixed(0)}K`;
  return `${bytes}B`;
}

const entries = [];
for (const entry of readdirSync(ROOT)) {
  const p = join(ROOT, entry);
  const st = lstatSync(p);
  if (st.isSymbolicLink()) continue;
  if (entry.startsWith('.') || entry === 'node_modules') continue;
  entries.push({
    name: entry,
    classification: classify(entry),
    size: st.isDirectory() ? humanSize(dirSize(p)) : humanSize(st.size),
    isDir: st.isDirectory(),
  });
}

// Disk pressure summary for the housekeeping tiering decision.
let { execSync } = { execSync: null };
let disk = null;
try {
  const { execSync: es } = await import('node:child_process');
  const out = es('df /home/p31 --output=pcent,used,avail -h').toString();
  const line = out.split('\n')[1]?.trim().split(/\s+/);
  disk = line ? { pct: line[0].replace('%', ''), used: line[1], avail: line[2] } : null;
} catch { /* no df */ }

const manifest = {
  generatedAt: new Date().toISOString(),
  root: ROOT,
  summary: {
    live: entries.filter((e) => e.classification === 'live').length,
    reference: entries.filter((e) => e.classification === 'reference').length,
    stale: entries.filter((e) => e.classification === 'stale').length,
    disk,
  },
  entries: entries.sort((a, b) => a.name.localeCompare(b.name)),
};

writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');
console.log(`probe-workspace: wrote ${OUT}`);
console.log(`  live: ${manifest.summary.live} · reference: ${manifest.summary.reference} · stale: ${manifest.summary.stale}`);
if (disk) console.log(`  disk: ${disk.pct}% used (${disk.used} / ${disk.avail} avail)`);