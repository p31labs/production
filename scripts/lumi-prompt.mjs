#!/usr/bin/env node
/**
 * lumi-prompt — the parameter-free inference-time adaptation stub (Track B4).
 *
 * No training is required to ship Lumi's first improvement: this assembles
 * Lumi's context for a proposal from (a) the deterministic memory fold
 * (semantic + narrative) and (b) the top relevant replay experiences. The log
 * is the memory; the retrieval is the adaptation; nothing leaves the device.
 *
 * Usage:
 *   node scripts/lumi-prompt.mjs <transcript.jsonl> "what should we build next?"
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));

import { foldMemory } from '../packages/canon/src/loom/memory.ts';
import { buildReplayMemory, retrieveReplay, coPresenceScore } from '../packages/canon/src/loom/training.ts';

function loadEvents(path) {
  return readFileSync(path, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
}

const path = process.argv[2];
const query = process.argv[3] ?? 'what should we build next?';
if (!path) { console.error('usage: lumi-prompt.mjs <transcript.jsonl> "<query>"'); process.exit(1); }

const events = loadEvents(path);
const mem = foldMemory(events);
const replay = buildReplayMemory(events, { consent: true });
const relevant = retrieveReplay(replay, query, 3);
const report = coPresenceScore(events);

const lines = [
  'You are Lumi — co-present, never delegating. You PROPOSE; the family decides.',
  `Memory (narrative): ${mem.narrative}`,
  `Focus: ${mem.focusNodes.map((f) => `${f.node}(${f.count})`).join(', ') || 'none yet'}`,
  `Approved so far: ${mem.approved.length}`,
];
if (relevant.length) {
  lines.push('Relevant past experience (retrieved, not trained):');
  for (const r of relevant) lines.push(`  • ${r.outcome} · ${r.task} → ${r.decision}`);
}
lines.push(`Co-presence: ${(report.score * 100).toFixed(0)}% (acceptance ${(report.acceptance * 100).toFixed(0)}%)`);
lines.push(`Family question: ${query}`);
lines.push('Propose ONE next step, as a structured body, and nothing more.');

console.log(lines.join('\n'));