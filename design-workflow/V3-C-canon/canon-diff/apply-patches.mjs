#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// V3-C-canon/canon-diff/apply-patches.mjs — minimal RFC 6902 applier (no deps).
// Supports the ops used by the C3 patches: test, add, remove.
// Applies patches IN ORDER onto a deep-copied JSON document; writes the result
// back to the target file. Fails closed (exit 1) on any op error.
//
// Usage:
//   node apply-patches.mjs <target.json> <patch1.json> [patch2.json ...]
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'node:fs';

function pointerGet(doc, ptr) {
  if (ptr === '') return doc;
  const keys = ptr.replace(/^\//, '').split('/').map((k) => k.replace(/~1/g, '/').replace(/~0/g, '~'));
  let cur = doc;
  for (const k of keys) {
    if (cur == null || !(k in Object(cur))) return undefined;
    cur = cur[k];
  }
  return cur;
}

function pointerParent(doc, ptr) {
  const keys = ptr.replace(/^\//, '').split('/').map((k) => k.replace(/~1/g, '/').replace(/~0/g, '~'));
  const last = keys.pop();
  let cur = doc;
  for (const k of keys) {
    if (cur == null || !(k in Object(cur))) return { parent: null, last };
    cur = cur[k];
  }
  return { parent: cur, last };
}

function applyOne(doc, op) {
  const { op: kind, path } = op;
  if (kind === 'test') {
    const cur = pointerGet(doc, path);
    if (JSON.stringify(cur) !== JSON.stringify(op.value)) {
      throw new Error(`test FAILED at ${path}: got ${JSON.stringify(cur)}, expected ${JSON.stringify(op.value)}`);
    }
    return doc;
  }
  if (kind === 'remove') {
    const { parent, last } = pointerParent(doc, path);
    if (parent == null || !(last in parent)) throw new Error(`remove FAILED at ${path}: target absent`);
    if (Array.isArray(parent)) parent.splice(Number(last), 1);
    else delete parent[last];
    return doc;
  }
  if (kind === 'add') {
    const { parent, last } = pointerParent(doc, path);
    if (parent == null) throw new Error(`add FAILED at ${path}: parent absent`);
    if (Array.isArray(parent)) {
      const idx = last === '-' ? parent.length : Number(last);
      parent.splice(idx, 0, op.value);
    } else {
      parent[last] = op.value;
    }
    return doc;
  }
  throw new Error(`unsupported op '${kind}' (only test/add/remove)`);
}

const target = process.argv[2];
const patches = process.argv.slice(3);
if (!target || !patches.length) {
  console.error('usage: node apply-patches.mjs <target.json> <patch1.json> [...]');
  process.exit(2);
}

const doc = JSON.parse(readFileSync(target, 'utf8'));
for (const p of patches) {
  const patch = JSON.parse(readFileSync(p, 'utf8'));
  console.log(`applying ${patch['patch-id'] ?? p} (${patch.operations.length} op(s)) → ${target}`);
  for (const op of patch.operations) applyOne(doc, op);
}
writeFileSync(target, JSON.stringify(doc, null, 2) + '\n');
console.log(`OK — wrote ${target} (${Buffer.byteLength(JSON.stringify(doc), 'utf8')} bytes)`);