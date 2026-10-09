#!/usr/bin/env node
/**
 * lib/cas.mjs — the content-addressable store (W12).
 *
 * Every version of every file is stored by SHA-256 content hash in
 * .objects/<aa>/<hash>. .refs/<path> points to the current version;
 * .refs/<path>@<ts> keeps every historical pointer.
 *
 * Properties (validated by snap-vault):
 *   - dedup: identical content stored once
 *   - point-in-time recovery: restore any version by path + timestamp
 *   - deletion recoverable by construction: the object survives even after
 *     the ref is removed
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, rmSync, renameSync } from 'node:fs';
import { join, dirname, relative, basename } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname;
export const OBJECTS_DIR = join(ROOT, '.cas', 'objects');
const REFS_DIR = join(ROOT, '.cas', 'refs');

function ensure() {
  mkdirSync(OBJECTS_DIR, { recursive: true });
  mkdirSync(REFS_DIR, { recursive: true });
}

export async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Store content by hash. Returns the hash. Dedups automatically. */
export async function put(content) {
  ensure();
  const hash = await sha256Hex(content);
  const objPath = join(OBJECTS_DIR, hash.slice(0, 2), hash);
  if (!existsSync(objPath)) {
    mkdirSync(dirname(objPath), { recursive: true });
    writeFileSync(objPath, content);
  }
  return hash;
}

/** Write a ref pointer. path is the workspace-relative path. */
export function setRef(path, hash, ts = new Date().toISOString()) {
  ensure();
  const refDir = join(REFS_DIR, dirname(path));
  mkdirSync(refDir, { recursive: true });
  writeFileSync(join(refDir, `${basename(path)}.ref`), hash);
  writeFileSync(join(refDir, `${basename(path)}@${ts}.ref`), hash);
}

/** Read the current hash for a path, or a historical one by timestamp. */
export function getRef(path, ts) {
  const refDir = join(REFS_DIR, dirname(path));
  const base = join(refDir, basename(path));
  const f = ts ? `${base}@${ts}.ref` : `${base}.ref`;
  if (!existsSync(f)) return null;
  return readFileSync(f, 'utf8').trim();
}

/** Read content by hash. Returns null if the object is gone. */
export function read(hash) {
  if (!hash) return null;
  const objPath = join(OBJECTS_DIR, hash.slice(0, 2), hash);
  return existsSync(objPath) ? readFileSync(objPath, 'utf8') : null;
}

/** Snapshot a file: store content + set the ref. Returns the hash. */
export async function snapshot(path) {
  const content = readFileSync(path, 'utf8');
  const hash = await put(content);
  setRef(relative(ROOT, path), hash);
  return hash;
}

/** Restore a file from the CAS by path (latest) or path+timestamp. */
export function restore(path, ts) {
  const rel = relative(ROOT, path);
  const hash = getRef(rel, ts);
  if (!hash) return { ok: false, reason: 'no ref' };
  const content = read(hash);
  if (content === null) return { ok: false, reason: 'object missing' };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return { ok: true, hash };
}

/** List all refs (the version catalog). */
export function listRefs() {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.ref') && !p.includes('@')) out.push(p.replace(REFS_DIR + '/', '').replace(/\.ref$/, ''));
    }
  };
  if (existsSync(REFS_DIR)) walk(REFS_DIR);
  return out.sort();
}