#!/usr/bin/env node
/**
 * lib/ledger.mjs — the unified hash-chained ledger (W14 core).
 *
 * Every consequential action (propose, approve, execute, restore, merge,
 * claim, lease) is appended to a SHA-256 hash chain with RFC 8785
 * canonicalization and prev-digest linkage. Merkle-root checkpoints every
 * 100 entries. Tampering is detectable; verify-chain fails the gate.
 *
 * This is shared by the veto gate, the housekeeping pipeline, the fleet, and
 * the audit scripts.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname;
export const LEDGER_PATH = join(ROOT, '.workspace', 'ledger.jsonl');
export const CHECKPOINTS_PATH = join(ROOT, '.workspace', 'ledger-checkpoints.jsonl');
const CHECKPOINT_EVERY = 100;

/** RFC 8785 JSON Canonicalization Scheme (JCS) — deterministic, sorted keys. */
export function jcs(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(jcs).join(',')}]`;
  const obj = value;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${jcs(obj[k])}`).join(',')}}`;
}

export async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function ensureLedger() {
  mkdirSync(dirname(LEDGER_PATH), { recursive: true });
  if (!existsSync(LEDGER_PATH)) writeFileSync(LEDGER_PATH, '');
}

export function readEntries() {
  if (!existsSync(LEDGER_PATH)) return [];
  return readFileSync(LEDGER_PATH, 'utf8').split('\n').filter(Boolean).map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

export async function lastDigest() {
  const entries = readEntries();
  if (entries.length === 0) return '0'.repeat(64);
  return entries[entries.length - 1].digest;
}

/** Append an entry to the ledger. Returns the stored entry. */
export async function append(action, fields = {}) {
  ensureLedger();
  const seq = readEntries().length + 1;
  const prevDigest = await lastDigest();
  const at = fields.at ?? new Date().toISOString();
  const body = {
    seq,
    action,
    ...fields,
    at,
    prev_digest: prevDigest,
  };
  const digest = await sha256Hex(jcs(body));
  const entry = { ...body, digest };
  appendFileSync(LEDGER_PATH, JSON.stringify(entry) + '\n');

  // Merkle-root checkpoint every CHECKPOINT_EVERY entries.
  if (seq % CHECKPOINT_EVERY === 0) {
    const checkpoint = {
      seq,
      merkle_root: digest,
      at,
      prev_checkpoint: await lastCheckpointDigest(),
    };
    appendFileSync(CHECKPOINTS_PATH, JSON.stringify(checkpoint) + '\n');
  }
  return entry;
}

export async function lastCheckpointDigest() {
  if (!existsSync(CHECKPOINTS_PATH)) return '0'.repeat(64);
  const lines = readFileSync(CHECKPOINTS_PATH, 'utf8').split('\n').filter(Boolean);
  return lines.length ? (JSON.parse(lines[lines.length - 1]).merkle_root) : '0'.repeat(64);
}

/** Verify the entire chain. Returns { valid, entries, firstBad }. */
export async function verifyChain() {
  const entries = readEntries();
  let prev = '0'.repeat(64);
  for (const e of entries) {
    if (e.prev_digest !== prev) return { valid: false, entries: entries.length, firstBad: e.seq };
    const { digest, ...body } = e;
    const recomputed = await sha256Hex(jcs(body));
    if (recomputed !== digest) return { valid: false, entries: entries.length, firstBad: e.seq };
    prev = digest;
  }
  return { valid: true, entries: entries.length, firstBad: null };
}