#!/usr/bin/env node
/**
 * test-loom-rldf.mjs — RLDF training-substrate tests.
 *
 * Verifies extractImagePairs pulls the (original, improved) screenshot pairs
 * with the correct labels, honors the consent/scope privacy gates, and that
 * the stats are right.
 */
import { extractImagePairs, rldfStats, toRewardModelJsonl } from '../dist/loom/rldf.js';

const EVENTS = [
  { seq: 1, ts: 't', writer: 'agent', kind: 'propose', id: 'p1', node: '.x', body: { title: 'a' } },
  { seq: 2, ts: 't', writer: 'human', kind: 'chat.artifact.approve', node: '.x', artifactId: 'art-1', scope: 'shared' },
  { seq: 3, ts: 't', writer: 'agent', kind: 'chat.artifact.generated', node: '.x', artifactId: 'art-1', artifactType: 'ui-tree', screenshotRef: 'r2://a-v1.png', screenshotRef2: 'r2://a-v2.png', scope: 'shared' },
  { seq: 4, ts: 't', writer: 'human', kind: 'chat.artifact.reject', node: '.x', artifactId: 'art-2', scope: 'shared' },
  { seq: 5, ts: 't', writer: 'agent', kind: 'chat.artifact.generated', node: '.x', artifactId: 'art-2', artifactType: 'ui-tree', screenshotRef: 'r2://b-v1.png', scope: 'shared' },
  { seq: 6, ts: 't', writer: 'agent', kind: 'chat.artifact.generated', node: '.x', artifactId: 'art-3', artifactType: 'ui-tree', screenshotRef: 'r2://c-v1.png', scope: 'shared' },
  // personal-scope generated event — never eligible for training
  { seq: 7, ts: 't', writer: 'agent', kind: 'chat.artifact.generated', node: '.private', artifactId: 'art-4', artifactType: 'ui-tree', screenshotRef: 'r2://d-v1.png', scope: 'personal' },
];

function assert(cond, msg) {
  if (!cond) { console.error(`FAIL: ${msg}`); process.exitCode = 1; } else { console.log(`ok: ${msg}`); }
}

// Consent gate: no consent → nothing.
assert(extractImagePairs(EVENTS, { consent: false }).length === 0, 'consent=false yields zero pairs');

// With consent: art-1 (paired, approve), art-2 (reject), art-3 (pending —
// no human decision yet → excluded). art-4 personal excluded.
const pairs = extractImagePairs(EVENTS, { consent: true });
assert(pairs.length === 2, `expected 2 trainable pairs, got ${pairs.length}`);
const art1 = pairs.find((p) => p.artifactId === 'art-1');
assert(art1 && art1.improved === 'r2://a-v2.png', 'art-1 carries the improved screenshot ref');
assert(art1 && art1.label === 'approve', 'art-1 labeled approve');
const art2 = pairs.find((p) => p.artifactId === 'art-2');
assert(art2 && art2.improved === null && art2.label === 'reject', 'art-2 single-shot reject');

const stats = rldfStats(pairs);
assert(stats.total === 2 && stats.paired === 1 && stats.approved === 1 && stats.rejected === 1, `stats correct (${JSON.stringify(stats)})`);

const jsonl = toRewardModelJsonl(pairs);
assert(jsonl.split('\n').length === 2, 'reward-model.jsonl has one line per pair');

console.log('test-loom-rldf: done');