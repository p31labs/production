#!/usr/bin/env node
/**
 * The Loom — local end-to-end chain verification (reproducible proof).
 *
 * This does NOT just run unit tests. It builds a real chain:
 *   1. commit() a fixed human+agent sequence → appends stamped events to the
 *      JSONL log (the same write path every writer uses).
 *   2. readEvents() reads them back from disk.
 *   3. linkChain() recomputes the SHA-256 chain from genesis.
 *   4. verifyChain() confirms every link holds.
 *   5. Tamper check: flip one record and confirm verification FAILS.
 *
 * This is the `pnpm verify` command referenced on /compliance — it proves a
 * chain was actually built and verified, not just that the logic exists.
 * No D1 binding, no deployed URL required.
 *
 * Run: pnpm verify  (from apps/loom)
 * Exit code 0 = chain built + verified + tamper detected. Exit code 1 = any gate failed.
 */
import { commit } from '@p31ca/canon/loom/commit';
import { linkChain, verifyChain, GENESIS_PREV_HASH } from '@p31ca/canon/loom/hash-chain';
import { readEvents } from '@p31ca/canon/loom/jsonl';
import { resolveLogPath } from '@p31ca/canon/loom/log-path';
import { codename } from '@p31ca/canon/loom/codename';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const logPath = join(tmpdir(), `p31-loom-verify-${process.pid}.jsonl`);
process.env.LOOM_LOG = logPath;

const sequence = [
  { writer: 'human', kind: 'focus', node: '--p31-accent' },
  { writer: 'agent', kind: 'presence', node: '--p31-accent', attention: 1 },
  { writer: 'agent', kind: 'traverse', from: '--p31-accent', to: '.glass-card', reason: 'referenced-by' },
  { writer: 'agent', kind: 'propose', id: 'prop_verify_1', node: '.feature-card', body: { draft: true }, author: codename('verify-agent') },
  // The LUMI placeBlock pair — an agent propose whose body carries a
  // BlockPlacement (blockId/slot/order), then the human approve that commits
  // it. Names are DERIVED code names (codename()), never hardcoded handles —
  // the log names roles, not people or models.
  { writer: 'agent', kind: 'propose', id: 'prop_block_1', node: 'main', body: { action: 'placeBlock', blockId: 'evidence-block', slot: 'main', order: 0 }, author: codename('lumi-agent') },
  { writer: 'human', kind: 'approve', proposal: 'prop_block_1', statedBy: codename('verify-guardian') },
  { writer: 'agent', kind: 'presence', node: '.feature-card', attention: 0.8 },
];

function fail(msg) {
  console.error(`[verify] FAILED: ${msg}`);
  process.exit(1);
}

console.log(`[verify] building a real chain at ${logPath}`);

try {
  for (const input of sequence) {
    const res = await commit(logPath, input);
    if (!res.valid) fail(`commit rejected: ${res.error}`);
  }
} catch (err) {
  fail(`seed failed: ${err instanceof Error ? err.message : err}`);
}

const events = readEvents(logPath);
if (events.length !== sequence.length) {
  fail(`expected ${sequence.length} events, read ${events.length}`);
}

const payloads = events.map((e) => ({ seq: e.seq, ts: e.ts, data: JSON.stringify(e) }));
const records = await linkChain(payloads);
const verdict = await verifyChain(records);

if (!verdict.valid) {
  fail(`chain broken at ${verdict.brokenAt} (checked ${verdict.checked})`);
}
if (records[0].prev_hash !== GENESIS_PREV_HASH) {
  fail('genesis prev_hash is not empty');
}

// Tamper check: corrupt the first record's data and confirm verification fails.
const tampered = records.map((r, i) =>
  i === 0 ? { ...r, data: r.data.slice(0, -2) + 'XX' } : r,
);
const tamperedVerdict = await verifyChain(tampered);
if (tamperedVerdict.valid) {
  fail('tamper check: a corrupted chain still verified (this must never happen)');
}

console.log(
  `[verify] OK — chain built from ${records.length} records, verified from genesis ` +
    `(head ${verdict.head}), and a tamper was correctly detected.`,
);
console.log(JSON.stringify({ service: 'p31-loom', ...verdict }, null, 2));
process.exit(0);