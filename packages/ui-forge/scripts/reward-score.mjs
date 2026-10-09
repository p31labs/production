#!/usr/bin/env node
/**
 * reward-score.mjs — RLDF reward-model proof + tie-break wiring.
 *
 * Two parts:
 *  1. PROOF (requires torch + transformers — run on a host with them):
 *     Score a rendered artifact PNG with Apple's rldfclip-sketch checkpoint
 *     (downloaded to packages/ui-forge/rldf/rldfclip-sketch-aug.tar):
 *
 *       # extract once
 *       cd packages/ui-forge/rldf && tar -xf rldfclip-sketch-aug.tar
 *       # score (from apple/ml-rldf):
 *       python reward_model_example_inference.py \
 *         --image_path <rendered.png> \
 *         --description "spoon tracker dashboard with a level metric and log action" \
 *         --model_path ./rldfclip-sketch \
 *         --processor_path openai/clip-vit-base-patch32
 *
 *  2. WIRING (done — this repo): the Governor's selectSurvivors uses an
 *     optional `reward` as a FIDELITY TIE-BREAK among equal structural scores.
 *     Admissibility stays non-compensatory (classifyAdmissibility); the reward
 *     never vetoes. See center.mjs `forge(spec, { rewardFn })`.
 *
 * Usage:
 *   node scripts/reward-score.mjs --spec <backend-spec.json> --out <dir>
 *     → runs the tetrahedron with a mock rewardFn (0..1) to demonstrate the
 *       tie-break, and writes the artifact tree + a template for the Python
 *       scoring call.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { forge } from '../src/center.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const CATALOG = JSON.parse(readFileSync(resolve(here, '../ui-schema.json'), 'utf8')).catalog;

function arg(f) { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : undefined; }
const specPath = arg('--spec');
const outDir = arg('--out') ?? resolve(here, '../rldf/out');

if (!specPath) {
  console.error('usage: node scripts/reward-score.mjs --spec <backend-spec.json> [--out dir]');
  process.exit(2);
}

const spec = JSON.parse(readFileSync(resolve(specPath), 'utf8'));

// A mock rewardFn (0..1) — stands in for the rldfclip-sketch CLIP score until
// a torch host runs the real inference. Demonstrates the tie-break wiring.
const mockReward = (tree) => 0.4 + ((tree?.children?.length ?? 0) % 3) * 0.2;

const provider = async () => JSON.stringify([
  { id: 'root', type: 'GlassPanel', props: {}, tokens: ['p31.glass.bg'],
    children: [{ type: 'MetricBadge', props: { label: 'Level' }, dataBinding: 'spoon.level' }] },
  { id: 'root', type: 'Card', props: { title: 'Level' }, tokens: ['p31.surface.bg'], dataBinding: 'spoon.level' },
]);

const report = await forge(spec, { k: 2, provider, catalog: CATALOG, rewardFn: mockReward });

mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'artifact.json'), JSON.stringify(report.artifact, null, 2));

console.log('artifact:', report.artifact?.type, '| survivors:', report.survivors.length);
console.log('rewardFn used (mock) — real score runs on a torch host via reward_model_example_inference.py');
console.log('artifact written to', resolve(outDir, 'artifact.json'));
console.log('\nTo score it with the real reward model:');
console.log('  python reward_model_example_inference.py --image_path <render-of-artifact.png> --description "<spec title>" --model_path ./rldfclip-sketch --processor_path openai/clip-vit-base-patch32');