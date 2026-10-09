#!/usr/bin/env node
/**
 * concierge/log-session.mjs — logs a concierge session as real Loom events.
 *
 * Posts an agent propose (Lumi's role, manually driven by the operator) and the
 * human's decision through the live API with the Lumi service token, so the
 * events enter the hash-chained log with real seq/hash semantics.
 *
 * Usage:
 *   CF_ACCESS_CLIENT_ID=... CF_ACCESS_CLIENT_SECRET=... \
 *     node scripts/concierge/log-session.mjs \
 *       --member "Maya" --node ".street" --label "add a bench" --reason "the street is the family room"
 *   ...then, after the human answers:
 *   node scripts/concierge/log-session.mjs --decision approve
 *   node scripts/concierge/log-session.mjs --decision reject --reason "their exact words"
 *
 * No secrets in the repo — credentials come from the environment.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = join(__dirname, '.session-state.json');

const BASE = process.env.LOOM_API_BASE ?? 'https://loom.p31ca.org';
const CLIENT_ID = process.env.CF_ACCESS_CLIENT_ID;
const CLIENT_SECRET = process.env.CF_ACCESS_CLIENT_SECRET;

function usage() {
  console.error(`usage:
  propose:  log-session.mjs --member <name> --node <.surface> --label <thing> --reason <why>
  decide:   log-session.mjs --decision approve|reject [--reason <their words>]`);
  process.exit(2);
}

function readArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) { args[key] = next; i++; }
      else args[key] = true;
    }
  }
  return args;
}

async function post(input) {
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error('set CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET');
  const res = await fetch(`${BASE}/api/loom/event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CF-Access-Client-Id': CLIENT_ID,
      'CF-Access-Client-Secret': CLIENT_SECRET,
    },
    body: JSON.stringify({ input }),
  });
  const body = await res.json();
  if (!body.valid) throw new Error(`gate rejected: ${body.error}`);
  return body.event;
}

function loadState() {
  try { return JSON.parse(readFileSync(STATE_PATH, 'utf8')); } catch { return {}; }
}
function saveState(s) { writeFileSync(STATE_PATH, JSON.stringify(s, null, 2)); }

const args = readArgs(process.argv.slice(2));

if (args.decision) {
  const state = loadState();
  if (!state.proposalId) { console.error('no active session — run a propose first'); process.exit(1); }
  const decision = args.decision;
  if (decision !== 'approve' && decision !== 'reject') usage();
  const event = await post({
    writer: 'human',
    kind: decision,
    proposal: state.proposalId,
    reason: args.reason,
    scope: 'shared',
    statedBy: state.member,
  });
  console.log(`logged ${decision} for ${state.proposalId} → seq ${event.seq} · ts ${event.ts}`);
  saveState({});
  process.exit(0);
}

if (!args.member || !args.node || !args.label) usage();
const id = `concierge-${Date.now()}`;
const propose = await post({
  writer: 'agent',
  kind: 'propose',
  id,
  node: args.node,
  body: { label: args.label, reason: args.reason, via: 'concierge' },
  scope: 'shared',
});
saveState({ proposalId: id, member: args.member, node: args.node, label: args.label });
console.log(`logged propose ${id} → seq ${propose.seq} · ts ${propose.ts}`);
console.log(`\nASK THE HUMAN: "${args.label}" — yes or no?\nThen run:\n  log-session.mjs --decision approve|reject [--reason "<their words>"]`);