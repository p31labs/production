#!/usr/bin/env node
/**
 * sic-povm-gate.mjs — the SIC-POVM completeness gate CLI.
 *
 * The deploy-precheck layer: runs the four /vision specialists (the
 * measurement tetrahedron) against one screenshot, feeds their reviews into
 * the completeness gate, and exits non-zero when the design is incomplete or
 * a corroborated critical finding is present.
 *
 * Usage:
 *   node sic-povm-gate.mjs --image <screenshot.png> [--endpoint <vision-url>]
 *     [--fail-below <mean>] [--json] [--reviews <reviews.json>]
 *
 * --image       screenshot to review (required unless --reviews is given)
 * --endpoint    /vision URL (default: deployed phos-ai-proxy)
 * --reviews     instead of calling /vision, use a pre-collected reviews JSON
 * --json        print the full gate verdict as JSON
 *
 * Exit 0 = gate passed (all four axes report, no corroborated criticals,
 * no major findings). Exit 1 = incomplete / needs-revision.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runGate, AXES } from './src/gate.mjs';
import { retryFetch } from './src/retry.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const VISION_URL = process.env.P31_VISION_URL || 'https://phos-ai-proxy.trimtab-signal.workers.dev/vision';
const VISION_MODEL = process.env.P31_VISION_MODEL || 'llama-3.2-11b';

import { slopDirective } from './src/slop-taxonomy.mjs';

const SPECIALIST_RUBRICS = {
  'layout-parity': 'You are the Vision Layout Parity specialist of the P31 measurement tetrahedron. Score the screenshot on layout_novelty, visual_identity_distinctiveness, component_pattern_novelty (0-10 each) with cited evidence, and return STRICT JSON: {"layout_novelty":0-10,"visual_identity_distinctiveness":0-10,"component_pattern_novelty":0-10,"evidence":{...},"verdict":"pass"|"fail","critique":"..."}. ' + slopDirective('layout-parity'),
  'sensory-safety': 'You are the Vision Sensory Safety specialist of the P31 measurement tetrahedron. Score the screenshot through a neurodivergent-first sensory lens on layout_novelty, visual_identity_distinctiveness, component_pattern_novelty (0-10 each) with cited evidence, and return STRICT JSON: {"layout_novelty":0-10,"visual_identity_distinctiveness":0-10,"component_pattern_novelty":0-10,"evidence":{...},"verdict":"pass"|"fail","critique":"..."}. ' + slopDirective('sensory-safety'),
  'identity-surface': 'You are the Vision Identity Surface specialist of the P31 measurement tetrahedron. Score the sovereign identity surface (user chip, DID, pre-mint state) plus layout_novelty, visual_identity_distinctiveness, component_pattern_novelty (0-10 each) with cited evidence, and return STRICT JSON: {"layout_novelty":0-10,"visual_identity_distinctiveness":0-10,"component_pattern_novelty":0-10,"evidence":{...},"verdict":"pass"|"fail","critique":"..."}. ' + slopDirective('identity-surface'),
  'motion-interaction': 'You are the Vision Motion & Interaction specialist of the P31 measurement tetrahedron. Score the interaction affordances (focus rings, pressed states, loading signals) plus layout_novelty, visual_identity_distinctiveness, component_pattern_novelty (0-10 each) with cited evidence, and return STRICT JSON: {"layout_novelty":0-10,"visual_identity_distinctiveness":0-10,"component_pattern_novelty":0-10,"evidence":{...},"verdict":"pass"|"fail","critique":"..."}. ' + slopDirective('motion-interaction'),
};

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function callVision(imageB64, rubric) {
  // Shared classified retry: 429/5xx/network retried with backoff; 4xx /
  // 7502/7504/7506 fail fast. /vision itself is now fault-tolerant (cross-
  // model fallback + neutral failure), so a persistent failure here is a
  // genuine "unmeasured" signal.
  const res = await retryFetch(VISION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageB64, rubric, model: VISION_MODEL, median: 1, noCache: true }),
  }, { timeoutMs: 120000 });
  return res.json();
}

function reviewFromVerdict(axis, d) {
  const mean = typeof d.mean === 'number' ? d.mean : (typeof d === 'number' ? d : null);
  const findings = [];
  const critique = String(d.critique ?? '');
  // Heuristic severity: a 'fail' verdict with a critique naming the axis → major.
  if (d.verdict === 'fail' && critique.length > 0) {
    findings.push({ axis, severity: 'major', issue: critique.slice(0, 160) });
  }
  // Thread the /vision degraded flag (cross-model/rubric fallback or neutral
  // 'unmeasured') so the gate reports needs-review instead of a silent pass.
  const degraded = d.degraded === true || d.verdict === 'unmeasured';
  return { axis, mean: mean ?? 0, verdict: d.verdict ?? 'fail', findings, degraded };
}

async function main() {
  const imagePath = arg('--image');
  const reviewsPath = arg('--reviews');
  const json = process.argv.includes('--json');

  let reviews;
  if (reviewsPath) {
    reviews = JSON.parse(readFileSync(resolve(reviewsPath), 'utf8'));
  } else if (imagePath) {
    const b64 = readFileSync(resolve(imagePath)).toString('base64');
    reviews = [];
    for (const axis of AXES) {
      try {
        const d = await callVision(b64, SPECIALIST_RUBRICS[axis]);
        reviews.push(reviewFromVerdict(axis, d));
        console.log(`  [${axis}] mean=${d.mean} verdict=${d.verdict}`);
      } catch (e) {
        console.log(`  [${axis}] /vision error: ${e.message}`);
        reviews.push({ axis, mean: 0, verdict: 'fail', findings: [] }); // collapsed = incomplete
      }
    }
  } else {
    console.error('usage: node sic-povm-gate.mjs --image <png> | --reviews <json> [--json]');
    process.exit(2);
  }

  const verdict = runGate(reviews);
  if (json) {
    console.log(JSON.stringify({ verdict, reviews }, null, 2));
  } else {
    console.log(`gate: ${verdict.status}`);
    if (verdict.collapsedAxes?.length) console.log(`  collapsed axes: ${verdict.collapsedAxes.join(', ')}`);
    if (verdict.degradedAxes?.length) console.log(`  degraded axes (needs review): ${verdict.degradedAxes.join(', ')}`);
    if (verdict.issues?.length) console.log(`  issues: ${verdict.issues.join(' | ')}`);
    console.log(`  state: ${JSON.stringify(verdict.state)}`);
  }
  // pass = go; anything else (incomplete / needs-revision / needs-review) = no-go.
  process.exit(verdict.status === 'pass' ? 0 : 1);
}

main().catch((e) => { console.error('sic-povm-gate error:', e.message); process.exit(1); });