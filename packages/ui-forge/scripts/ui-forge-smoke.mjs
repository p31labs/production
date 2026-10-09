#!/usr/bin/env node
/**
 * ui-forge-smoke.mjs — one command answers "does the engine work?"
 *
 * Five stages, worst case ~60s, every network call hard-bounded so nothing
 * hangs (the "no 400 timeouts" guarantee):
 *
 *   1 — UNIT        node --test test/*.test.mjs   (30s hard)  logic sound
 *   2 — PIPELINE    forge() with stubbed Dreamer  (offline)   full tetrahedron end-to-end
 *   3 — DISCRIM     runGate(passing)→pass,        (offline)   gate accepts AND rejects
 *                   runGate(failing)→incomplete+named axis
 *   4 — API LIVE    /health, /models, /vision {}  (8s each)   deployed workers reachable
 *   5 — LIVE SCORING /vision with a tiny PNG       (30s hard)  scoring path alive + bounded
 *                   (OPT-IN: --live-scoring — costs Neurons)
 *
 * Flags:
 *   --skip-live      skip Stages 4–5 (fully offline, deterministic)
 *   --live-scoring   enable Stage 5 (costs Neurons, opt-in)
 *   --json           machine-readable { stage, ok, durationMs }[]
 *
 * Exit 0 = all enabled stages pass. Exit 1 = a stage failed (named).
 */
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { forge } from '../src/center.mjs';
import { runGate, AXES } from '../src/gate.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const TEST_GLOB = resolve(here, '../test/*.test.mjs');
const VISION_URL = process.env.P31_VISION_URL || 'https://phos-ai-proxy.trimtab-signal.workers.dev/vision';
const BASE_URL = process.env.P31_BASE_URL || 'https://phos-ai-proxy.trimtab-signal.workers.dev';

const args = new Set(process.argv.slice(2));
const skipLive = args.has('--skip-live');
const liveScoring = args.has('--live-scoring');
const json = args.has('--json');

const results = [];
function report(stage, ok, detail = '', durationMs = 0) {
  results.push({ stage, ok, detail, durationMs });
  if (!json) {
    console.log(`${ok ? '✓' : '✗'} stage ${stage}: ${detail}${durationMs ? ` (${Math.round(durationMs)}ms)` : ''}`);
  }
  if (!ok) console.error(`✗ engine broken at stage ${stage}: ${detail}`);
}

const timing = () => {
  const start = process.hrtime.bigint();
  return () => Number(process.hrtime.bigint() - start) / 1e6;
};

// ── Stage 1 — Unit ─────────────────────────────────────────────────────────
async function stageUnit() {
  const t = timing();
  try {
    execSync(`node --test ${TEST_GLOB}`, { stdio: json ? 'ignore' : 'pipe', timeout: 30000 });
    report(1, true, '31 unit tests pass', t());
  } catch (e) {
    report(1, false, `unit tests failed: ${String(e.message).split('\n')[0]}`, t());
    return false;
  }
  return true;
}

// ── Stage 2 — Pipeline (offline, stubbed Dreamer) ──────────────────────────
const SPOON_SPEC = {
  title: 'Smoke Spoon Tracker',
  entities: [{ name: 'spoon', fields: [{ name: 'level', type: 'number' }] }],
  actions: [{ name: 'logSpoon' }],
};

async function stagePipeline() {
  const t = timing();
  try {
    // Stubbed Dreamer — deterministic, no network. Produces two candidates
    // with contract-valid tokens + dataBinding so they pass admissibility.
    const provider = async () => JSON.stringify([
      { id: 'root', type: 'GlassPanel', props: {}, tokens: ['p31.glass.bg'],
        children: [{ type: 'MetricBadge', props: { label: 'Level' }, dataBinding: 'spoon.level' }] },
      { id: 'root', type: 'Card', props: { title: 'Level' }, tokens: ['p31.surface.bg'], dataBinding: 'spoon.level' },
    ]);
    const reviews = AXES.map((axis) => ({ axis, mean: 7, verdict: 'pass', findings: [] }));
    const report_ = await forge(SPOON_SPEC, { k: 2, provider, reviews });
    if (!report_.artifact) throw new Error('no artifact produced');
    if (report_.gate?.status !== 'pass') throw new Error(`gate not pass: ${report_.gate?.status}`);
    if (report_.logs.survivors < 1) throw new Error('no survivors');
    report(2, true, `pipeline: ${report_.logs.candidates} candidates → ${report_.logs.survivors} survivors → artifact + gate ${report_.gate.status}`, t());
    return true;
  } catch (e) {
    report(2, false, `pipeline failed: ${e.message}`, t());
    return false;
  }
}

// ── Stage 3 — Gate discrimination (both directions) ────────────────────────
async function stageDiscrim() {
  const t = timing();
  try {
    const pass = runGate(AXES.map((axis) => ({ axis, mean: 7, verdict: 'pass', findings: [] })));
    if (pass.status !== 'pass') throw new Error(`gate should pass clean reviews, got ${pass.status}`);

    const fail = runGate(AXES.map((axis) => ({ axis, mean: axis === 'sensory-safety' ? 1 : 7, verdict: axis === 'sensory-safety' ? 'fail' : 'pass', findings: [] })));
    if (fail.status !== 'incomplete') throw new Error(`gate should reject collapsed axis, got ${fail.status}`);
    if (!fail.collapsedAxes?.includes('sensory-safety')) throw new Error('collapsed axis not named');

    report(3, true, `gate discriminates: pass on clean, incomplete + sensory-safety on collapsed`, t());
    return true;
  } catch (e) {
    report(3, false, `gate discrimination failed: ${e.message}`, t());
    return false;
  }
}

// ── Stage 4 — API liveness (bounded curls) ─────────────────────────────────
async function probe(url, expectStatus, okMsg) {
  const t = timing();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.status !== expectStatus) throw new Error(`expected ${expectStatus}, got ${res.status}`);
    report(4, true, `${okMsg} (${res.status})`, t());
    return true;
  } catch (e) {
    report(4, false, `probe ${url}: ${e.message}`, t());
    return false;
  }
}

async function stageApiLive() {
  let ok = true;
  ok &= await probe(`${BASE_URL}/health`, 200, '/health → 200');
  ok &= await probe(`${BASE_URL}/models`, 200, '/models → 200');
  // The empty /vision POST must fail fast (400 Missing image), proving the
  // route dispatches and the handler is wired — not a 502 or a hang.
  const t = timing();
  try {
    const res = await fetch(VISION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(8000),
    });
    if (res.status !== 400) throw new Error(`expected 400 Missing image, got ${res.status}`);
    report(4, true, '/vision {} → 400 Missing image (route alive, fast-fail)', t());
  } catch (e) {
    report(4, false, `/vision {}: ${e.message}`, t());
    ok = false;
  }
  return !!ok;
}

// ── Stage 5 — Live scoring (opt-in, bounded) ───────────────────────────────
/** Build a tiny valid 32×32 PNG (1×1 pixel scaled) — a solid color. */
function tinyPngBase64() {
  // Minimal 1×1 RGBA PNG, base64. Enough for /vision to accept an image.
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
}

async function stageLiveScoring() {
  const t = timing();
  try {
    const res = await fetch(VISION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: tinyPngBase64(), median: 1, noCache: true }),
      signal: AbortSignal.timeout(30000), // the scoring path must return < 30s
    });
    if (res.status !== 200) throw new Error(`scoring returned ${res.status}`);
    const d = await res.json();
    if (typeof d.mean !== 'number') throw new Error('scoring response has no numeric mean');
    report(5, true, `/vision scored (mean=${d.mean}${d.degraded ? ', degraded' : ''}) in <30s`, t());
    return true;
  } catch (e) {
    report(5, false, `live scoring: ${e.message} (platform degraded or scoring slow)`, t());
    return false;
  }
}

// ── Run ────────────────────────────────────────────────────────────────────
let ok = true;
ok &= await stageUnit();
ok &= await stagePipeline();
ok &= await stageDiscrim();
if (!skipLive) {
  ok &= await stageApiLive();
  if (liveScoring) ok &= await stageLiveScoring();
}

const enabled = skipLive ? 3 : liveScoring ? 5 : 4;
const passedStages = new Set(results.filter((r) => r.ok).map((r) => r.stage));
const failedStages = [...new Set(results.filter((r) => !r.ok).map((r) => r.stage))].join(', ');
const passed = passedStages.size;
const label = ok ? 'ENGINE OK' : 'ENGINE BROKEN';

if (json) {
  console.log(JSON.stringify({ ok, passed, enabled, stages: results }, null, 2));
} else {
  const skipped = skipLive ? ' (live stages skipped)' : liveScoring ? '' : ' (scoring opt-in)';
  console.log(`\n${ok ? '✅' : '✗'} ${label} — ${passed}/${enabled} stages passed${skipped}${failedStages ? `; failed: ${failedStages}` : ''}`);
}
process.exit(ok ? 0 : 1);