#!/usr/bin/env node
/**
 * check-publish-peers.mjs — the peer-resolution gate.
 *
 * Independent versioning (no versioning.fixed) means the coupling between
 * packages is expressed ONLY through peerDependencies. On publish, pnpm rewrites
 * a `workspace:*` peerDep to a concrete range — but only if the target package
 * exists and has a version. A peerDep on a sibling that is missing, versionless,
 * or still `workspace:*` after publish is a dangling reference that strands
 * consumers.
 *
 * This gate fails if any published package's peerDependencies on a @p31ca/*
 * sibling (or any `workspace:*` range) does not resolve to a real workspace
 * package with a version. It is the deterministic local half; the network half
 * (the target is actually on npm) is verified by `pnpm publish --dry-run` in
 * release:check.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DIRS = ['packages', 'apps', 'workers'];

const workspace = new Map(); // name -> { version, dir }
for (const d of DIRS) {
  const dir = join(ROOT, d);
  if (!existsSync(dir)) continue;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry, 'package.json');
    if (!existsSync(p)) continue;
    let j;
    try { j = JSON.parse(readFileSync(p, 'utf8')); } catch { continue; }
    if (j.name && j.version) workspace.set(j.name, { version: j.version, dir: `${d}/${entry}` });
  }
}

const problems = [];
for (const [name, info] of workspace) {
  const p = join(ROOT, info.dir, 'package.json');
  const j = JSON.parse(readFileSync(p, 'utf8'));
  if (!j.peerDependencies) continue;
  for (const [dep, range] of Object.entries(j.peerDependencies)) {
    const isSibling = dep.startsWith('@p31ca/');
    const isWorkspaceRange = range === 'workspace:*' || range === 'workspace:^' || range === 'workspace:~';
    if (!isSibling && !isWorkspaceRange) continue; // external peer (react, three) — out of scope
    if (!workspace.has(dep)) {
      problems.push(`${name}: peerDependency ${dep}@${range} — target not in workspace`);
    } else if (!workspace.get(dep).version) {
      problems.push(`${name}: peerDependency ${dep}@${range} — target has no version`);
    }
    // NOTE: a `workspace:*` range is the correct LOCAL convention — pnpm rewrites
    // it to a concrete range on publish. The rewrite itself is verified by
    // `pnpm publish --dry-run` in release:check, not here.
  }
}

if (problems.length) {
  console.error('✗ check-publish-peers: dangling or non-resolvable peerDependencies:');
  problems.forEach((p) => console.error(`   ${p}`));
  process.exit(1);
}
console.log('✅ check-publish-peers: all sibling peerDependencies resolve to versioned workspace packages.');