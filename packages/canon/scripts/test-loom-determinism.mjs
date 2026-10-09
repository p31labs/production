#!/usr/bin/env node
/**
 * @p31ca/canon — test-loom-determinism.mjs
 *
 * Seeded stress: build a long, varied log through the gate, then prove two
 * independent folds produce byte-identical canonical state, and that
 * stateAt(N) is stable across repeated calls (no shared mutable arrays).
 *
 * Run: node scripts/test-loom-determinism.mjs  (from packages/canon)
 */
import { ReplayGate, canonicalize } from '../dist/loom/gate.js';
import { initialState, reduce, replay } from '../dist/loom/events.js';
import { codename } from '../dist/loom/codename.js';

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(0xc0ffee);
const nodes = ['--p31-accent', '--p31-bg', '.glass-card', '.feature-card', '.btn', 'Button', 'ocean'];
const picks = (n) => nodes[Math.floor(rand() * n)];

const g = new ReplayGate();
const ids = [];
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

for (let i = 0; i < 60; i++) {
  g.append({ writer: 'human', kind: 'focus', node: picks(nodes.length) });
  g.append({ writer: 'agent', kind: 'presence', node: picks(nodes.length), attention: Number(rand().toFixed(2)) });

  const id = `prop_${i}`;
  ids.push(id);
  g.append({ writer: 'agent', kind: 'propose', id, node: picks(nodes.length), body: { i } });
  g.append({ writer: 'agent', kind: 'traverse', from: picks(nodes.length), to: picks(nodes.length), reason: 'references' });

  const roll = rand();
  if (roll < 0.5) g.append({ writer: 'human', kind: 'approve', proposal: id });
  else if (roll < 0.8) g.append({ writer: 'human', kind: 'reject', proposal: id, reason: 'seeded reject' });
  else g.append({ writer: 'human', kind: 'revise', proposal: id, body: { i, revised: true } });
}

const n = g.getLogLength();
ok(n >= 300, `expected a long log, got ${n}`);

// Double fold — the determinism proof.
const a = canonicalize(replay(g.getLog()));
const b = canonicalize(replay(g.getLog()));
ok(a === b, 'two replays of the same log must be byte-identical');

// verify() — the gate's own double-replay + compare.
const v = g.verify(reduce, initialState());
ok(v.valid, `verify() must pass: ${v.error ?? ''}`);

// stateAt stability + no shared mutable arrays.
for (let at = 0; at < n; at += 17) {
  const s1 = g.stateAt(at);
  const s2 = g.stateAt(at);
  ok(canonicalize(s1) === canonicalize(s2), `stateAt(${at}) must be stable across calls`);
  ok(canonicalize(s1) === canonicalize(replay(g.getLog(), at)), `stateAt(${at}) must equal replay at ${at}`);
}

// ── v1 chain compat — the additive chat.* extension must not break a frozen
//    v1 chain (focus/presence/propose/traverse/approve + view.save + the
//    instrument.*/control.* v1 kinds). Every v1 event must still validate, and
//    the chain must round-trip unchanged. ────────────────────────────────
{
  const v1Chain = [
    { writer: 'human', kind: 'focus', node: '--p31-accent' },
    { writer: 'agent', kind: 'presence', node: '--p31-accent', attention: 0.9 },
    { writer: 'agent', kind: 'propose', id: 'v1_prop', node: '.feature-card', body: { draft: 1 } },
    { writer: 'agent', kind: 'traverse', from: '--p31-accent', to: '.feature-card', reason: 'references' },
    { writer: 'human', kind: 'approve', proposal: 'v1_prop' },
    { writer: 'human', kind: 'view.save', label: 'v1 window', from: 0, to: 4 },
    { writer: 'human', kind: 'instrument.zone.place', node: '.stage', position: [0, 1, 0], timbre: 'warm' },
    { writer: 'human', kind: 'control.mapping.set', source: 'ui:control-cutoff', destination: 'synth:param-cutoff', mapping: { value: 0.5 } },
  ];

  // Every frozen v1 event still passes the extended gate (additive-only change).
  const gv1 = new ReplayGate();
  for (const e of v1Chain) {
    const r = gv1.append(e);
    ok(r.valid, `v1 event '${e.kind}' must still validate under the extended gate: ${r.error ?? ''}`);
  }

  // JSONL round-trip: the v1 chain replays byte-identically.
  const gv1rt = new ReplayGate();
  const rrt = gv1rt.fromJSONL(gv1.toJSONL());
  ok(rrt.valid, `v1 chain must replay through the extended gate: ${rrt.error ?? ''}`);
  ok(gv1rt.getLogLength() === gv1.getLogLength(), 'v1 chain round-trip length must match');

  // Determinism still holds when v1.1 chat.* events are appended AFTER a v1 chain.
  const gext = new ReplayGate();
  for (const e of v1Chain) gext.append(e);
  gext.append({ writer: 'human', kind: 'chat.send', node: 'thread_1', prompt: 'sha256:abc', agent: codename('lumi') });
  gext.append({ writer: 'agent', kind: 'chat.artifact.generated', node: 'thread_1', artifactId: 'art_1', artifactType: 'design' });
  const ca = canonicalize(replay(gext.getLog()));
  const cb = canonicalize(replay(gext.getLog()));
  ok(ca === cb, 'mixed v1 + chat chain must double-fold identically');

  // And the extended chain passes the gate's own verify() determinism proof.
  const vv = gext.verify(reduce, initialState());
  ok(vv.valid, `mixed v1 + chat chain verify() must pass: ${vv.error ?? ''}`);
}

if (fails.length) {
  console.error(`\n❌ LOOM DETERMINISM FAILED — ${fails.length} failure(s):`);
  for (const f of fails) console.error(`   • ${f}`);
  process.exit(1);
}
console.log(`✅ loom determinism — ${n} seeded events, double fold identical, verify() green, ${Math.ceil(n / 17)} stateAt checkpoints stable.`);
