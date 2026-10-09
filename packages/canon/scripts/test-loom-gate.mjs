#!/usr/bin/env node
/**
 * @p31ca/canon — test-loom-gate.mjs
 *
 * Gate integrity: writer-per-kind, duplicate/orphan rejection, JSONL
 * round-trip, stateAt ↔ replay agreement, and double-replay determinism.
 *
 * Run: node scripts/test-loom-gate.mjs  (from packages/canon)
 */
import { ReplayGate, canonicalize } from '../dist/loom/gate.js';
import { initialState, reduce, replay } from '../dist/loom/events.js';
import { codename } from '../dist/loom/codename.js';

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

function seedProposal(g, id = 'prop_1') {
  const r = g.append({ writer: 'agent', kind: 'propose', id, node: '.feature-card', body: { draft: 1 } });
  ok(r.valid, `seed propose should be valid: ${r.error ?? ''}`);
  return id;
}

// ── writer-per-kind ────────────────────────────────────────────────────
{
  const g = new ReplayGate();
  ok(!g.append({ writer: 'agent', kind: 'focus', node: 'x' }).valid, 'agent focus must be rejected');
  ok(!g.append({ writer: 'human', kind: 'traverse', from: 'a', to: 'b', reason: 'r' }).valid, 'human traverse must be rejected');
  ok(!g.append({ writer: 'human', kind: 'presence', node: 'x', attention: 1 }).valid, 'human presence must be rejected');
  ok(!g.append({ writer: 'agent', kind: 'approve', proposal: 'p' }).valid, 'agent approve must be rejected');
}

// ── duplicate + orphan ─────────────────────────────────────────────────
{
  const g = new ReplayGate();
  seedProposal(g, 'prop_dup');
  ok(!g.append({ writer: 'agent', kind: 'propose', id: 'prop_dup', node: 'x', body: {} }).valid, 'duplicate proposal id must be rejected');
  ok(!g.append({ writer: 'human', kind: 'approve', proposal: 'nope' }).valid, 'approve of unknown proposal must be rejected');
  ok(!g.append({ writer: 'human', kind: 'revise', proposal: 'nope', body: {} }).valid, 'revise of unknown proposal must be rejected');
  ok(!g.append({ writer: 'human', kind: 'reject', proposal: 'nope', reason: 'x' }).valid, 'reject of unknown proposal must be rejected');
}

// ── valid sequence + seq assignment ────────────────────────────────────
{
  const g = new ReplayGate();
  ok(g.append({ writer: 'human', kind: 'focus', node: '--p31-accent' }).valid, 'human focus valid');
  ok(g.append({ writer: 'agent', kind: 'presence', node: '--p31-accent', attention: 0.9 }).valid, 'agent presence valid');
  const pid = seedProposal(g);
  ok(g.append({ writer: 'agent', kind: 'traverse', from: '--p31-accent', to: '.feature-card', reason: 'references' }).valid, 'agent traverse valid');
  ok(g.append({ writer: 'human', kind: 'approve', proposal: pid }).valid, 'human approve valid');
  ok(g.getLogLength() === 5, `expected 5 events, got ${g.getLogLength()}`);
  ok(g.getLog()[0].seq === 0 && g.getLog()[4].seq === 4, 'seq must be assigned 0..4 by the gate');
}

// ── JSONL round-trip preserves fields ──────────────────────────────────
{
  const g1 = new ReplayGate();
  seedProposal(g1, 'prop_rt');
  g1.append({ writer: 'human', kind: 'reject', proposal: 'prop_rt', reason: 'incomplete' });

  const g2 = new ReplayGate();
  const r = g2.fromJSONL(g1.toJSONL());
  ok(r.valid, `fromJSONL valid: ${r.error ?? ''}`);
  ok(g2.getLogLength() === 2, `round-trip length 2, got ${g2.getLogLength()}`);
  ok(JSON.stringify(g2.getLog()[1]) === JSON.stringify(g1.getLog()[1]), 'round-trip must preserve every field');
}

// ── stateAt ↔ replay agreement ─────────────────────────────────────────
{
  const g = new ReplayGate();
  g.append({ writer: 'human', kind: 'focus', node: '--p31-bg' });
  const pid = seedProposal(g, 'prop_x');
  g.append({ writer: 'human', kind: 'revise', proposal: pid, body: { draft: 2 } });
  const log = g.getLog();
  for (const at of [0, 1, 2, 3]) {
    const a = canonicalize(g.stateAt(at));
    const b = canonicalize(replay(log, at));
    ok(a === b, `stateAt(${at}) must equal replay(events, ${at})`);
  }
}

// ── double-replay determinism + nondeterministic reducer caught ─────────
{
  const g = new ReplayGate();
  g.append({ writer: 'human', kind: 'focus', node: '--p31-bg' });
  seedProposal(g, 'prop_d');

  ok(g.verify(reduce, initialState()).valid, 'verify() must pass on a pure reducer');

  // Genuinely nondeterministic: the value depends on how many times the
  // reducer has been called, so the second fold diverges from the first.
  let calls = 0;
  const bad = (s, e) => ({ ...reduce(s, e), agentAttention: calls++ });
  const caught = g.verify(bad, initialState());
  ok(!caught.valid, 'verify() must catch a nondeterministic reducer');
  ok(/nondeterministic/i.test(caught.error ?? ''), 'the failure must name nondeterminism');
}

// ── control.* kinds — the control-server configuration events (§6) ──────────
{
  const g = new ReplayGate();

  // Writer-per-kind: control events are human configuration acts.
  ok(!g.append({ writer: 'agent', kind: 'control.mapping.set', source: 'ui:control-cutoff', destination: 'synth:param-cutoff', mapping: { value: 0.5 } }).valid, 'agent control.mapping.set must be rejected');

  // A valid mapping.set commits.
  ok(g.append({ writer: 'human', kind: 'control.mapping.set', source: 'ui:control-cutoff', destination: 'synth:param-cutoff', mapping: { value: 0.5 } }).valid, 'valid control.mapping.set accepted');

  // Source grammar: UI control, MIDI input, OSC path, WLED sync.
  ok(g.append({ writer: 'human', kind: 'control.mapping.set', source: 'midi:in-1', destination: 'synth:param-attack', mapping: { value: 0.1 } }).valid, 'midi:in source accepted');
  ok(!g.append({ writer: 'human', kind: 'control.mapping.set', source: 'garbage', destination: 'synth:param-x', mapping: {} }).valid, 'malformed source rejected');

  // MVP one-to-one: a destination already bound to another source is rejected.
  ok(!g.append({ writer: 'human', kind: 'control.mapping.set', source: 'ui:control-cutoff', destination: 'synth:param-resonance', mapping: {} }).valid, 'rebinding ui:control-cutoff to a second destination rejected');
  ok(!g.append({ writer: 'human', kind: 'control.mapping.set', source: 'osc:/other', destination: 'synth:param-cutoff', mapping: {} }).valid, 'second source to bound destination rejected');

  // Idempotent clear: unbinding an unbound pair is a no-op, not an error.
  ok(g.append({ writer: 'human', kind: 'control.mapping.clear', source: 'ui:control-cutoff', destination: 'synth:param-cutoff' }).valid, 'clear of bound pair accepted');
  ok(g.append({ writer: 'human', kind: 'control.mapping.clear', source: 'ui:control-cutoff', destination: 'synth:param-cutoff' }).valid, 'clear is idempotent (second clear no-op)');

  // A clear whose pair does not match must NOT unbind the real binding.
  const g5 = new ReplayGate();
  ok(g5.append({ writer: 'human', kind: 'control.mapping.set', source: 'ui:control-cutoff', destination: 'synth:param-cutoff', mapping: { value: 0.5 } }).valid, 'set before mismatched clear');
  ok(g5.append({ writer: 'human', kind: 'control.mapping.clear', source: 'ui:control-cutoff', destination: 'synth:param-resonance' }).valid, 'clear of a different destination is a no-op (valid)');
  ok(!g5.append({ writer: 'human', kind: 'control.mapping.set', source: 'osc:/other', destination: 'synth:param-cutoff', mapping: {} }).valid, 'destination still bound after mismatched clear');
  ok(g5.append({ writer: 'human', kind: 'control.mapping.clear', source: 'ui:control-cutoff', destination: 'synth:param-cutoff' }).valid, 'real pair clears cleanly');

  ok(g.append({ writer: 'human', kind: 'control.mapping.set', source: 'ui:control-cutoff', destination: 'synth:param-cutoff', mapping: { value: 0.9 } }).valid, 'rebind accepted after clear');

  // patch.set: engine enum + param value types (structural only — the param
  // registry is the DO's domain, not the gate's).
  ok(g.append({ writer: 'human', kind: 'control.patch.set', engine: 'polysynth', params: { cutoff: 0.7 } }).valid, 'valid control.patch.set accepted');
  ok(!g.append({ writer: 'human', kind: 'control.patch.set', engine: 'theremin', params: { x: 1 } }).valid, 'unknown engine rejected');
  ok(!g.append({ writer: 'human', kind: 'control.patch.set', engine: 'drumkit', params: { decay: [1, 2] } }).valid, 'non-scalar param rejected');

  // midi.learn: cc must be an integer 0..127.
  ok(g.append({ writer: 'human', kind: 'control.midi.learn', source: 'midi:in-1', controlId: 'control-filter', cc: 74 }).valid, 'valid control.midi.learn accepted');
  ok(!g.append({ writer: 'human', kind: 'control.midi.learn', source: 'midi:in-1', controlId: 'control-filter', cc: 128 }).valid, 'cc above 127 rejected');
  ok(!g.append({ writer: 'human', kind: 'control.midi.learn', source: 'midi:in-1', controlId: 'control-filter', cc: -1 }).valid, 'negative cc rejected');

  // Round-trip: JSONL must replay the control events with routing intact.
  const g2 = new ReplayGate();
  const rt = g2.fromJSONL(g.toJSONL());
  ok(rt.valid, 'control events round-trip through JSONL');
  const g3 = new ReplayGate();
  ok(g3.append({ writer: 'human', kind: 'control.mapping.set', source: 'wled:sync', destination: 'wled:seg-0', mapping: {} }).valid, 'wled:sync source accepted');
  const g4 = new ReplayGate();
  const rt2 = g4.fromJSONL(g3.toJSONL());
  ok(rt2.valid, 'wled control event round-trips');
}

// ── chat.* kinds — the v1.1 additive conversation extension ────────────────
{
  const g = new ReplayGate();

  // Writer-per-kind: chat.send and chat.artifact.approve/reject are human
  // conversation acts; chat.artifact.generated is the agent's artifact
  // production record (the writer-per-kind rule is derived from the gate's
  // HUMAN_KINDS/AGENT_KINDS, exactly like instrument.* / control.*).
  ok(g.append({ writer: 'human', kind: 'chat.send', node: 'thread_1', prompt: 'sha256:abc', agent: codename('lumi') }).valid, 'human chat.send accepted');
  ok(!g.append({ writer: 'agent', kind: 'chat.send', node: 'thread_1', prompt: 'sha256:abc', agent: codename('lumi') }).valid, 'agent chat.send must be rejected');

  ok(g.append({ writer: 'agent', kind: 'chat.artifact.generated', node: 'thread_1', artifactId: 'art_1', artifactType: 'design' }).valid, 'agent chat.artifact.generated accepted');
  ok(!g.append({ writer: 'human', kind: 'chat.artifact.generated', node: 'thread_1', artifactId: 'art_1', artifactType: 'design' }).valid, 'human chat.artifact.generated must be rejected');

  ok(g.append({ writer: 'human', kind: 'chat.artifact.approve', node: 'thread_1', artifactId: 'art_1' }).valid, 'human chat.artifact.approve accepted');
  ok(g.append({ writer: 'human', kind: 'chat.artifact.reject', node: 'thread_1', artifactId: 'art_1', reason: 'sha256:def' }).valid, 'human chat.artifact.reject accepted');
  ok(!g.append({ writer: 'agent', kind: 'chat.artifact.approve', node: 'thread_1', artifactId: 'art_1' }).valid, 'agent chat.artifact.approve must be rejected');
  ok(!g.append({ writer: 'agent', kind: 'chat.artifact.reject', node: 'thread_1', artifactId: 'art_1', reason: 'r' }).valid, 'agent chat.artifact.reject must be rejected');

  // The structural scope shape check applies to the new human chat kinds too
  // (it is keyed on scope/humanId, not kind — recorded in out/c1_scope_evidence.txt):
  // personal requires humanId; shared rejects it.
  ok(!g.append({ writer: 'human', kind: 'chat.send', node: 'thread_1', prompt: 'p', agent: codename('lumi'), scope: 'personal' }).valid, 'personal chat.send without humanId rejected');
  ok(g.append({ writer: 'human', kind: 'chat.send', node: 'thread_1', prompt: 'p', agent: codename('lumi'), scope: 'personal', humanId: 'alice' }).valid, 'personal chat.send with humanId accepted');
  ok(!g.append({ writer: 'human', kind: 'chat.send', node: 'thread_1', prompt: 'p', agent: codename('lumi'), scope: 'shared', humanId: 'alice' }).valid, 'shared chat.send with humanId rejected');

  // JSONL round-trip: chat.* events must replay through the extended gate.
  const g2 = new ReplayGate();
  const rt = g2.fromJSONL(g.toJSONL());
  ok(rt.valid, 'chat.* events round-trip through JSONL');
  ok(g2.getLogLength() === g.getLogLength(), 'chat.* round-trip length matches');
}

if (fails.length) {
  console.error(`\n❌ LOOM GATE FAILED — ${fails.length} failure(s):`);
  for (const f of fails) console.error(`   • ${f}`);
  process.exit(1);
}
console.log('✅ loom gate — writer-per-kind, duplicate/orphan, round-trip, stateAt, double-replay. All green.');
