#!/usr/bin/env node
/**
 * lib/softdelete.mjs — soft delete by default (W13).
 *
 * Nothing is ever hard-deleted on the first pass. A file moves to
 * .trash/<timestamp>/<path>, its header is updated (status: trashed), and a
 * hash-chained ledger entry is written. Restore is a move back.
 *
 * Hard delete requires: (a) the retention window elapsed, AND (b) a second
 * human approval token.
 */
import { renameSync, readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname;
export const TRASH_DIR = join(ROOT, '.trash');

export function ensureTrash() {
  mkdirSync(TRASH_DIR, { recursive: true });
}

/** Soft-delete a file: CAS-snapshot, move to .trash/, update the header, write a ledger entry. */
export async function softDelete(path, { reason = 'soft-delete', actor = 'did:agent:?', tokenId } = {}) {
  ensureTrash();
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const destDir = join(TRASH_DIR, ts, dirname(path).replace(/^\/+/, ''));
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, basename(path));

  // CAS snapshot first (the version guarantee — the object survives even
  // after the ref is removed).
  let casHash = null;
  if (existsSync(path)) {
    try {
      const cas = await import('./cas.mjs');
      casHash = await cas.snapshot(path);
    } catch { /* CAS unreachable — the trash copy still holds the recovery */ }
  }

  // Update the P31-HEADER status to trashed (if present).
  if (existsSync(path)) {
    const content = readFileSync(path, 'utf8');
    if (content.includes('P31-HEADER')) {
      const updated = content
        .replace(/status:\s*\S+/, 'status: trashed')
        .replace(/retention:\s*\S+/, 'retention: stale');
      writeFileSync(path, updated);
    }
    renameSync(path, dest);
  }

  const ledger = await import('./ledger.mjs');
  await ledger.append('execute', { action: 'soft-delete', path, dest, reason, actor, token_id: tokenId, cas_hash: casHash });
  return { ok: true, dest, ts, cas_hash: casHash };
}

/** Restore a file from .trash/ back to its original path. */
export async function restore(trashedPath, destPath) {
  if (!existsSync(trashedPath)) return { ok: false, reason: 'not in trash' };
  mkdirSync(dirname(destPath), { recursive: true });
  renameSync(trashedPath, destPath);
  const ledger = await import('./ledger.mjs');
  await ledger.append('restore', { action: 'restore', from: trashedPath, to: destPath });
  return { ok: true };
}

/** List everything in the trash. */
export function listTrash() {
  const out = [];
  const walk = (dir, rel = '') => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      const r = rel ? `${rel}/${e}` : e;
      if (statSync(p).isDirectory()) walk(p, r);
      else out.push({ trashPath: p, original: r });
    }
  };
  if (existsSync(TRASH_DIR)) walk(TRASH_DIR);
  return out;
}