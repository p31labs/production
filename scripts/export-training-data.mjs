#!/usr/bin/env node
/**
 * export-training-data — the log → training-data exporter (Track B).
 *
 * Reads a JSONL transcript of LoomEvents (or a directory of them), applies the
 * consent + scope rules, and writes two JSONL training sets:
 *
 *   <out>.sft.jsonl      — instruction examples (KurrentDB pattern):
 *                          { context, decision, outcome }
 *   <out>.pref.jsonl     — preference pairs (DPO) + single-signal (KTO):
 *                          { prompt, chosen, rejected } | { prompt, completion, label }
 *
 * Usage:
 *   node scripts/export-training-data.mjs <transcript.jsonl> --out ./data \
 *     [--consent] [--include-personal]
 *
 * The privacy posture is literal: without `--consent`, nothing is exported.
 * `personal` events are only exported when --include-personal is passed
 * (replay-only use — never for fine-tuning, per the COPPA posture).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
import {
  extractTrainingExamples,
  toInstructionExample,
  exportPreferencePairs,
} from '../packages/canon/src/loom/training.ts';

function parseArgs(argv) {
  const [path, ...rest] = argv;
  const flags = { consent: false, includePersonal: false, out: './data', recommend: false };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--consent') flags.consent = true;
    else if (a === '--include-personal') flags.includePersonal = true;
    else if (a === '--recommend') flags.recommend = true;
    else if (a === '--out') flags.out = rest[++i];
  }
  return { path, flags };
}

/**
 * The research-backed training-data recommendation ("When Does Preference
 * Optimization Help?", Meng et al., extended 2026):
 *   <  50 → retrieval-only (lumi-prompt.mjs); do NOT fine-tune — DPO/KTO at
 *           this scale actively harms (the reference model dominates)
 *   50–200 → KTO only (its unbiased estimator is robust to imbalanced
 *           approve/reject); no DPO below 200
 *   200–500 → SFT first, then DPO with low β
 *   > 500 pairs → standard DPO
 */
function recommendation(sftCount, pairCount, ktoCount) {
  const source = '(source: Meng et al., "When Does Preference Optimization Help?", 2026, §4.2)';
  if (sftCount < 50) {
    return `RETRIEVAL-ONLY — this log is below the fine-tuning threshold (research: <50 examples, DPO/KTO actively harms). Ship lumi-prompt.mjs; re-run when the log grows. ${source}`;
  }
  if (pairCount >= 500) return `SFT + DPO — enough preference pairs (≥500) for standard DPO. ${source}`;
  if (ktoCount >= 200) return `SFT first, then DPO (200–500 pairs, low β 0.05–0.1). ${source}`;
  if (ktoCount >= 50) return `KTO only (50–200 single-signal examples; KTO is robust to imbalanced approve/reject) — no DPO at this scale. ${source}`;
  return `SFT only — too few preference signals yet; keep appending and re-export. ${source}`;
}

function loadEvents(path) {
  const text = readFileSync(path, 'utf8');
  return text.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
}

const { path, flags } = parseArgs(process.argv.slice(2));
if (!path) {
  console.error('usage: export-training-data.mjs <transcript.jsonl> --out ./data [--consent] [--include-personal]');
  process.exit(1);
}
if (!flags.consent) {
  console.error('no --consent — nothing exported (the privacy posture is literal)');
  process.exit(1);
}

const events = loadEvents(path);
const opts = { consent: true, includePersonal: flags.includePersonal };

const sft = extractTrainingExamples(events, opts).map(toInstructionExample);
const pref = exportPreferencePairs(events, opts);

mkdirSync(flags.out, { recursive: true });
const sftPath = join(flags.out, 'lumi.sft.jsonl');
const prefPath = join(flags.out, 'lumi.pref.jsonl');
writeFileSync(sftPath, sft.map((x) => JSON.stringify(x)).join('\n') + '\n');
writeFileSync(prefPath, pref.map((x) => JSON.stringify(x)).join('\n') + '\n');

console.log(`exported ${sft.length} SFT examples → ${sftPath}`);
console.log(`exported ${pref.length} preference examples → ${prefPath}`);
console.log(`  (DPO pairs: ${pref.filter((p) => p.chosen && p.rejected).length}, KTO signals: ${pref.filter((p) => 'label' in p).length})`);
if (flags.recommend) {
  console.log(`recommendation: ${recommendation(sft.length, pref.filter((p) => p.chosen && p.rejected).length, pref.filter((p) => 'label' in p).length)}`);
}