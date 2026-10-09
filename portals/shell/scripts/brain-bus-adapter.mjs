#!/usr/bin/env node
/**
 * scripts/brain-bus-adapter.mjs — the enterprise-grade brain pipeline → bus
 * bridge (Node sidecar).
 *
 * brain.mjs uses node:fs (spoon/tide/family context) and therefore cannot run
 * on Cloudflare Workers. This sidecar runs the real pipeline in Node and
 * forwards every emitted event to the shell's bus ledger via POST /api/bus/emit.
 *
 * Usage:
 *   node scripts/brain-bus-adapter.mjs "your brain dump" [--mode quick|full] [--bus URL]
 *
 * The bus URL defaults to the local dev host; set --bus for production.
 */
import { processBrainDump } from '/home/p31/production/tools (1)/phos-forge/brain.mjs';

const BUS_URL = process.env.P31_BUS_URL ?? 'http://localhost:5210';

function parseArgs(argv) {
  const args = { text: '', mode: 'quick', bus: BUS_URL };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--mode') args.mode = argv[++i] ?? 'quick';
    else if (a === '--bus') args.bus = argv[++i] ?? BUS_URL;
    else if (!args.text) args.text = a;
  }
  return args;
}

const args = parseArgs(process.argv);
if (!args.text) {
  console.error('usage: node scripts/brain-bus-adapter.mjs "brain dump text" [--mode quick|full] [--bus URL]');
  process.exit(1);
}

async function forward(type, payload) {
  const event = { type, ...payload };
  try {
    const res = await fetch(`${args.bus}/api/bus/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!res.ok) console.error(`[bus] emit ${type} -> HTTP ${res.status}`);
  } catch (err) {
    console.error(`[bus] emit ${type} failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

console.log(`[brain] running ${args.mode} mode -> bus ${args.bus}`);
const result = await processBrainDump(args.text, {
  mode: args.mode,
  emit: forward,
});
console.log(`[brain] done:`, JSON.stringify({ session: result.session, mode: result.mode, themes: result.themes, thoughts: result.thoughts }));
process.exit(0);