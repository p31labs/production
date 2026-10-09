#!/usr/bin/env node
/**
 * lumi-eval — the LUMI ecosystem five-phase eval CLI.
 *
 * A thin CLI over the canon scorer (`@p31ca/canon/loom/scoring`), which is the
 * single source of `scoreTranscript` / `judgeProposal` / `sessionTrend` / the
 * GOOD/BAD/HARD_BAD samples — and is unit-tested in the canon gate.
 *
 * Run:
 *   node scripts/lumi-eval.mjs                        # all built-in samples
 *   node scripts/lumi-eval.mjs good                   # only the good sample
 *   node scripts/lumi-eval.mjs bad hard-bad           # only the bad ones
 *   node scripts/lumi-eval.mjs --sample=good          # flag form
 *   node scripts/lumi-eval.mjs <transcript.jsonl>     # score a real log
 *   node scripts/lumi-eval.mjs --judge [file|samples] # + the 3-criterion rubric
 *
 * Exit 1 if any selected sample misses its dimension floors (canon-eval
 * discipline). The bad samples are DESIGNED to fail — in CI they are gated by
 * an expect-fail step, and the discrimination check itself is a canon unit
 * test (see test-loom-training.mjs).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
import {
  scoreTranscript,
  judgeProposal,
  FLOORS,
  GOOD,
  BAD,
  HARD_BAD,
} from '../packages/canon/src/loom/scoring.ts';

const SAMPLES = { good: GOOD, bad: BAD, 'hard-bad': HARD_BAD };

function parseTranscript(text) {
  return text.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
}

let failed = false;
const run = (name, events) => {
  const s = scoreTranscript(events);
  const rows = [
    ['planning', s.planning, FLOORS.planning],
    ['safety', s.safety, FLOORS.safety],
    ['coPresence', s.coPresence, FLOORS.coPresence],
    ['memory', s.memory, FLOORS.memory],
    ['structure', s.structure, FLOORS.structure],
  ];
  console.log(`\n— ${name} —`);
  for (const [dim, got, floor] of rows) {
    const pass = got >= floor;
    if (!pass) failed = true;
    console.log(`  ${pass ? '✓' : '✗'} ${dim.padEnd(11)} ${got.toFixed(2)} (floor ${floor})`);
  }
  for (const v of s.violations) console.log(`  ! ${v}`);
  for (const t of s.trend) {
    console.log(`  trend ${t.scope}: ${t.proposals} proposals · ${t.decisions} decisions · rate ${t.decisionRate.toFixed(2)} · latency ${t.avgLatencyMs ?? '—'}ms`);
  }
  if (judge) {
    for (const p of events.filter((e) => e.writer === 'agent' && e.kind === 'propose')) {
      const j = judgeProposal(p);
      console.log(`  judge ${j.id}: target=${j.criteria.concreteTarget ? 1 : 0} action=${j.criteria.namedAction ? 1 : 0} reason=${j.criteria.statedReason ? 1 : 0} → ${j.total.toFixed(2)}`);
    }
  }
};

const judge = process.argv.includes('--judge');
const scriptPath = process.argv[1];
// sample selection: positional (`good`, `bad`, `hard-bad`) or flag form
// (`--sample=good`, `--sample good`) — so a transcript named "good.jsonl"
// can't collide with the sample selector.
const flagSamples = [];
for (let i = 0; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--sample=')) flagSamples.push(a.slice('--sample='.length));
  else if (a === '--sample' && process.argv[i + 1] && !process.argv[i + 1].startsWith('-')) {
    flagSamples.push(process.argv[i + 1]);
    i++;
  }
}
const selected = new Set([...process.argv.filter((a) => a in SAMPLES), ...flagSamples]);
// Unknown --sample values must fail loudly (a typo silently running nothing —
// and exiting 0 — is a CI footgun).
for (const s of flagSamples) {
  if (!(s in SAMPLES)) {
    console.error(`lumi-eval: unknown sample '${s}' (expected one of: ${Object.keys(SAMPLES).join(', ')})`);
    process.exit(2);
  }
}
const fileArg = process.argv.find((a) => a !== process.argv[0] && a !== scriptPath && a !== '--judge' && !a.startsWith('-') && !(a in SAMPLES) && a !== '--sample');
if (fileArg) {
  run(`transcript ${fileArg}`, parseTranscript(readFileSync(fileArg, 'utf8')));
} else {
  const names = selected.size ? Object.keys(SAMPLES).filter((n) => selected.has(n)) : Object.keys(SAMPLES);
  for (const name of names) run(name, SAMPLES[name]);
}

if (failed) {
  console.error('\nlumi-eval: floor missed — failing');
  process.exit(1);
}
console.log('\nlumi-eval: all floors met');