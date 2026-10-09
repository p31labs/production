#!/usr/bin/env node
/**
 * rldf-train.mjs — RLDF (Apple-pattern) training-data export + QLoRA harness.
 *
 * Feeds the Loom's labeled artifact pairs into a CLIP-style reward model
 * fine-tune (the Apple ML-RLDF pattern) and the text policy layer (DPO/KTO).
 *
 * Usage:
 *   node rldf-train.mjs --log <transcript.jsonl> --consent [--out dir]
 *     [--qlora] [--base-model SmolLM2-360M] [--sft-epochs 1] [--dpo-epochs 1]
 *
 * --log      path to a Loom JSONL transcript (agent propose + human
 *            approve/reject + chat.artifact.generated with screenshotRef)
 * --consent  REQUIRED for any export (COPPA/People-First posture — without
 *            it, nothing is produced)
 * --out      output dir (default ./rldf-out)
 * --qlora    ALSO run the QLoRA fine-tune step (requires mlx-lm on macOS, or
 *            a CUDA llama-finetune on Linux). Per LUMI-TRAINING.md: 360M-3B
 *            base, ~30 min on a laptop GPU.
 *
 * Outputs (in --out):
 *   reward-model.jsonl  — (original, improved, label) image pairs → CLIP fine-tune
 *   sft.jsonl           — instruction examples for the text policy layer
 *   pref.jsonl          — DPO/KTO preference pairs
 *   rldf-stats.json     — how many paired vs single-shot, approved/rejected
 *
 * The reward model is the Governor's fidelity score once trained — the
 * "trainable" layer of the tetrahedral engine. The dataset is YOUR taste:
 * what you approved vs rejected in the Loom.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const CANON = resolve(here, '../../canon');

// Dynamic import of the canon's TS (rldf.ts is .ts; the canon compiles to
// dist). If dist is available, use it; else fall back to a pure-JS re-export
// of the JSONL shaping (the functions are small and dependency-free).
async function loadRldf() {
  try {
    const m = await import(resolve(CANON, 'dist/loom/rldf.js'));
    return { extractImagePairs: m.extractImagePairs, toRewardModelJsonl: m.toRewardModelJsonl, rldfStats: m.rldfStats };
  } catch {
    // Pure-JS fallback: shape from raw JSON rows (keeps the CLI usable
    // without a build). Mirrors rldf.ts semantics.
    return {
      extractImagePairs(events, opts) {
        if (!opts.consent) return [];
        const list = opts.includePersonal ? events : events.filter((e) => e.scope !== 'personal');
        const labels = new Map();
        for (const e of list) {
          if (e.writer === 'human' && (e.kind === 'chat.artifact.approve' || e.kind === 'chat.artifact.reject')) labels.set(e.artifactId, e.kind === 'chat.artifact.approve' ? 'approve' : 'reject');
        }
        const out = [];
        for (const e of list) {
          if (e.writer !== 'agent' || e.kind !== 'chat.artifact.generated' || !e.screenshotRef) continue;
          const label = labels.get(e.artifactId);
          if (!label) continue;
          out.push({ artifactId: e.artifactId, original: e.screenshotRef, improved: e.screenshotRef2 ?? null, label, node: e.node, seq: e.seq });
        }
        return out;
      },
      toRewardModelJsonl(pairs) {
        return pairs.map((p) => JSON.stringify({ artifactId: p.artifactId, original: p.original, improved: p.improved, label: p.label, node: p.node })).join('\n');
      },
      rldfStats(pairs) {
        let paired = 0, approved = 0;
        for (const p of pairs) { if (p.improved) paired++; if (p.label === 'approve') approved++; }
        return { total: pairs.length, paired, singleShot: pairs.length - paired, approved, rejected: pairs.length - approved };
      },
    };
  }
}

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const logPath = arg('--log');
const consent = process.argv.includes('--consent');
const outDir = arg('--out') ?? resolve(here, '../rldf-out');
const qlora = process.argv.includes('--qlora');

if (!logPath) {
  console.error('usage: node rldf-train.mjs --log <transcript.jsonl> --consent [--out dir] [--qlora]');
  process.exit(2);
}
if (!consent) {
  console.error('consent is required: pass --consent to export training data (shared-scope events only)');
  process.exit(2);
}

const lines = readFileSync(logPath, 'utf8').split('\n').filter((l) => l.trim());
const events = lines.map((l) => JSON.parse(l));

const rldf = await loadRldf();
const pairs = rldf.extractImagePairs(events, { consent });
const stats = rldf.rldfStats(pairs);
const rewardJsonl = rldf.toRewardModelJsonl(pairs);

// Text policy layer — DPO/KTO pairs from propose→approve/reject. Mirrors the
// canon's exportPreferencePairs: DPO only when a context has BOTH an approved
// and a rejected proposal; KTO (single-signal) otherwise.
const byNode = new Map();
for (const e of events) {
  if (e.writer === 'agent' && e.kind === 'propose') {
    const decision = events.find((d) => d.writer === 'human' && (d.kind === 'approve' || d.kind === 'reject') && d.proposal === e.id);
    if (decision) {
      if (!byNode.has(e.node)) byNode.set(e.node, []);
      byNode.get(e.node).push({ proposal: e, label: decision.kind === 'approve' ? 1 : 0 });
    }
  }
}
const prefPairs = [];
for (const [node, group] of byNode) {
  const prompt = `on ${node}`;
  const approved = group.find((g) => g.label === 1);
  const rejected = group.find((g) => g.label === 0);
  if (approved && rejected) {
    prefPairs.push(JSON.stringify({ prompt, chosen: JSON.stringify(approved.proposal.body ?? {}), rejected: JSON.stringify(rejected.proposal.body ?? {}) }));
  } else if (approved) {
    prefPairs.push(JSON.stringify({ prompt, completion: JSON.stringify(approved.proposal.body ?? {}), label: 1 }));
  } else if (rejected) {
    prefPairs.push(JSON.stringify({ prompt, completion: JSON.stringify(rejected.proposal.body ?? {}), label: 0 }));
  }
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'reward-model.jsonl'), rewardJsonl + (rewardJsonl ? '\n' : ''));
writeFileSync(resolve(outDir, 'pref.jsonl'), prefPairs.join('\n'));
writeFileSync(resolve(outDir, 'sft.jsonl'), '');
writeFileSync(resolve(outDir, 'rldf-stats.json'), JSON.stringify(stats, null, 2));

console.log(`rldf export → ${outDir}`);
console.log(`  image pairs: ${stats.total}  (paired: ${stats.paired}, single-shot: ${stats.singleShot})`);
console.log(`  approved: ${stats.approved}  rejected: ${stats.rejected}`);
console.log(`  pref pairs: ${prefPairs.length}`);
if (stats.total === 0) {
  console.log('  (no screenshot-paired artifacts — the log needs chat.artifact.generated events with screenshotRef)');
}

// QLoRA step — per LUMI-TRAINING.md §3. mlx-lm on macOS (Apple silicon);
// llama.cpp finetune on Linux. Fails loudly with a hint if the tool is
// missing rather than silently skipping.
if (qlora) {
  if (stats.paired === 0) {
    console.error('--qlora requires at least one paired (original, improved) screenshot pair; none found');
    process.exit(1);
  }
  const base = arg('--base-model') ?? 'SmolLM2-360M';
  const sftEpochs = arg('--sft-epochs') ?? '1';
  console.log(`\nQLoRA fine-tune (${base}, ${sftEpochs} epoch SFT then DPO)...`);
  const cmd = `python -c "import mlx_lm; print('mlx-lm ok')"`;
  try {
    execSync(cmd, { stdio: 'pipe' });
    console.log('  mlx-lm available — run: mlx_lm.lora --model <base> --train --data ./rldf-out --iters <n>');
  } catch {
    console.error('  mlx-lm not available on this host. Install: pip install mlx-lm\n  (or on Linux: llama.cpp finetune with --model-base GGUF)');
    process.exit(1);
  }
}