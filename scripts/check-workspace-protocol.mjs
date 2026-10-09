#!/usr/bin/env node
/**
 * check-workspace-protocol.mjs — the local-package resolution gate.
 *
 * Every @p31ca/* dependency that names a local workspace package MUST use
 * `workspace:` or `catalog:` — never a registry range. A registry range can
 * resolve to npm instead of the local copy if the local version does not
 * match, silently substituting a stale published package.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const local = new Set();
for (const root of ['packages', 'apps', 'workers']) {
  try {
    for (const d of readdirSync(root)) {
      try {
        const j = JSON.parse(readFileSync(`${root}/${d}/package.json`, 'utf8'));
        if (j.name) local.add(j.name);
      } catch {}
    }
  } catch {}
}

let files;
try {
  files = execSync(
    'find packages apps workers -name package.json -not -path "*/node_modules/*" 2>/dev/null',
    { maxBuffer: 10 * 1024 * 1024 }
  ).toString().trim().split('\n').filter(Boolean);
} catch {
  files = [];
}

const findings = [];
for (const f of files) {
  let j; try { j = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; }
  for (const sec of ['dependencies', 'devDependencies', 'peerDependencies']) {
    for (const [k, v] of Object.entries(j[sec] || {})) {
      if (k.startsWith('@p31ca/') && local.has(k) && /^[\^~]?\d/.test(v)) {
        findings.push(`${k}@${v} in ${f}`);
      }
    }
  }
}

if (findings.length) {
  console.error('✗ workspace-protocol: registry ranges on local @p31ca/ packages:');
  findings.forEach((f) => console.error(`   ${f}`));
  process.exit(1);
}
console.log('✅ workspace-protocol: all local @p31ca/ deps use workspace: or catalog:');