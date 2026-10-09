#!/usr/bin/env node
/**
 * @p31ca/canon — test-loom-training.mjs
 *
 * LUMI ecosystem training core: extraction of (context, decision) examples
 * from the log, SEC compression, replay retrieval, and the co-presence score.
 *
 * Run: node scripts/test-loom-training.mjs  (from packages/canon)
 */
import {
  extractTrainingExamples,
  buildReplayMemory,
  compressExperience,
  retrieveReplay,
  coPresenceScore,
  toInstructionExample,
  exportPreferencePairs,
} from '../dist/loom/training.js';
import { evaluateProposal, ScopeGuard, scopeAudit } from '../dist/loom/scope.js';
import { createGateway, dispatchAgentAction } from '../dist/loom/gateway.js';
import { scoreTranscript, meetsFloors, FLOORS, GOOD, BAD, HARD_BAD } from '../dist/loom/scoring.js';

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

let seq = 0;
const ev = (e) => ({ seq: ++seq, ts: new Date(seq).toISOString(), ...e });

// ── fixture: a family log with two decided proposals + one pending + personal ──
const log = [
  ev({ writer: 'human', kind: 'focus', node: '.feature-card', scope: 'shared', humanId: 'alex' }),
  ev({ writer: 'agent', kind: 'propose', id: 'p1', node: '.feature-card', body: { draft: 1, label: 'warm theme' }, scope: 'shared' }),
  ev({ writer: 'human', kind: 'approve', proposal: 'p1', scope: 'shared', humanId: 'maya' }),
  ev({ writer: 'agent', kind: 'propose', id: 'p2', node: '.street', body: { label: 'add a bench' }, scope: 'shared' }),
  ev({ writer: 'human', kind: 'reject', proposal: 'p2', reason: 'too complex for this week', scope: 'shared', humanId: 'sam' }),
  // Pending — no human decision, must be excluded.
  ev({ writer: 'agent', kind: 'propose', id: 'p3', node: '.vault', body: { label: 'rotate key' }, scope: 'shared' }),
  // Personal — never eligible without includePersonal.
  ev({ writer: 'human', kind: 'focus', node: '.private-note', scope: 'personal', humanId: 'maya' }),
  ev({ writer: 'agent', kind: 'propose', id: 'p4', node: '.private-note', body: { label: 'secret draft' }, scope: 'personal' }),
  ev({ writer: 'human', kind: 'approve', proposal: 'p4', scope: 'personal', humanId: 'maya' }),
];

// ── extractTrainingExamples ───────────────────────────────────────────
{
  const examples = extractTrainingExamples(log, { consent: true, contextWindow: 2 });
  ok(examples.length === 2, `expected 2 decided examples, got ${examples.length}`);
  const [p1, p2] = examples;
  ok(p1.label === 'approve' && p1.proposalId === 'p1', 'p1 should be labeled approve');
  ok(p2.label === 'reject' && p2.proposalId === 'p2', 'p2 should be labeled reject');
  ok(p1.context.length <= 2, 'context window respected');
  ok(!examples.some((x) => x.proposalId === 'p3'), 'pending proposal excluded');
  ok(!examples.some((x) => x.proposalId === 'p4'), 'personal proposal excluded without includePersonal');
}

// ── consent gate ──────────────────────────────────────────────────────
{
  ok(extractTrainingExamples(log, { consent: false }).length === 0, 'no consent → no training examples');
}

// ── compression + instruction format ──────────────────────────────────
{
  const [first] = extractTrainingExamples(log, { consent: true });
  const c = compressExperience(first);
  ok(typeof c.task === 'string' && c.task.length > 0, 'compressed task present');
  ok(c.outcome === 'approve', 'compressed outcome = approve');
  ok(c.decision.includes('warm theme'), 'compressed decision includes body');
  const inst = toInstructionExample(first);
  ok(inst.outcome === 'approve' && inst.context.length > 0, 'instruction example shape correct');
}

// ── replay memory + retrieval ─────────────────────────────────────────
{
  const memory = buildReplayMemory(log, { consent: true });
  ok(memory.length === 2, `replay memory has 2 units, got ${memory.length}`);
  const hits = retrieveReplay(memory, 'warm theme', 1, { minReplayScore: 0.1 });
  ok(hits.length === 1, 'retrieval returns the warm-theme experience');
  ok(hits[0].task.includes('.feature-card'), 'retrieved the right experience');
  const none = retrieveReplay(memory, 'quantum physics rocket', 1, { minReplayScore: 0.1 });
  ok(none.length === 0, 'irrelevant query returns nothing');
}

// ── co-presence score ─────────────────────────────────────────────────
{
  const report = coPresenceScore(log);
  ok(report.score > 0.5, `decided transcript scores above 0.5 (got ${report.score.toFixed(2)})`);
  ok(report.approved === 2 && report.rejected === 1, `approved=2, rejected=1 (got ${report.approved}/${report.rejected})`);
  ok(report.violations.length === 0, 'no writer-per-kind violations');

  // An agent emitting a human-only kind must zero the score.
  const bad = [...log, ev({ writer: 'agent', kind: 'focus', node: 'x' })];
  const badReport = coPresenceScore(bad);
  ok(badReport.score === 0 && badReport.violations.length === 1, 'agent human-kind violation zeros the score');

  // A human emitting an agent-only kind is the mirror-image violation.
  const reverse = [...log, ev({ writer: 'human', kind: 'presence', node: 'x', attention: 1 })];
  const revReport = coPresenceScore(reverse);
  ok(revReport.score === 0 && revReport.violations.length === 1, 'human agent-kind violation zeros the score');

  // Acceptance is per-proposal-id: duplicate approves on one proposal still count once.
  const dup = [
    ev({ writer: 'agent', kind: 'propose', id: 'd1', node: '.x', body: { a: 1 }, scope: 'shared' }),
    ev({ writer: 'human', kind: 'approve', proposal: 'd1', scope: 'shared', humanId: 'a' }),
    ev({ writer: 'human', kind: 'approve', proposal: 'd1', scope: 'shared', humanId: 'b' }),
  ];
  const dupReport = coPresenceScore(dup);
  ok(dupReport.approved === 1, `duplicate approves count once (got ${dupReport.approved})`);
  ok(dupReport.acceptance <= 1, 'acceptance never exceeds 1');
}

// ── string body handling (no double-encode) ───────────────────────────
{
  const stringLog = [
    ev({ writer: 'agent', kind: 'propose', id: 's1', node: '.x', body: 'just a note', scope: 'shared' }),
    ev({ writer: 'human', kind: 'approve', proposal: 's1', scope: 'shared', humanId: 'a' }),
  ];
  const [ex] = extractTrainingExamples(stringLog, { consent: true });
  const c = compressExperience(ex);
  ok(c.decision === 'just a note', `string body not double-encoded (got ${c.decision})`);
}

// ── retrieval relevance floor + recency ───────────────────────────────
{
  const memory = buildReplayMemory(log, { consent: true });
  const none = retrieveReplay(memory, 'quantum physics rocket', 1, { minReplayScore: 0.5 });
  ok(none.length === 0, 'below-floor query returns nothing');
  const warm = retrieveReplay(memory, 'warm theme', 1, { minReplayScore: 0.1 });
  ok(warm.length === 1, 'above-floor query returns the experience');
}

// ── preference pairs (DPO / KTO) ──────────────────────────────────────
{
  const pairsLog = [
    ev({ writer: 'agent', kind: 'propose', id: 'r1', node: '.street', body: { label: 'warm bench' }, scope: 'shared' }),
    ev({ writer: 'human', kind: 'reject', proposal: 'r1', reason: 'too big', scope: 'shared', humanId: 'a' }),
    ev({ writer: 'agent', kind: 'propose', id: 'r2', node: '.street', body: { label: 'small bench' }, scope: 'shared' }),
    ev({ writer: 'human', kind: 'approve', proposal: 'r2', scope: 'shared', humanId: 'b' }),
  ];
  const pairs = exportPreferencePairs(pairsLog, { consent: true });
  ok(pairs.length === 1, `expected one DPO pair, got ${pairs.length}`);
  ok(pairs[0].chosen && pairs[0].rejected, 'DPO pair has chosen + rejected');
  ok(pairs[0].chosen.includes('small bench') && pairs[0].rejected.includes('warm bench'), 'chosen/rejected assigned correctly');

  const kto = exportPreferencePairs(log, { consent: true });
  ok(kto.length === 2, `KTO fallback emits per-example signals (got ${kto.length})`);
  ok(kto.every((p) => p.label === 0 || p.label === 1), 'KTO labels are 0 or 1');
}

// ── scope declaration + governance gateway ────────────────────────────
{
  const scope = { surfaces: ['street', 'craft', 'docs'], proposeKinds: ['propose'], humanApprovedKinds: ['approve', 'reject', 'focus', 'revise'], maxProposalsPerSession: 2, coPresenceOnly: true };
  const inScope = { writer: 'agent', kind: 'propose', id: 'x', node: 'docs', body: { a: 1 } };
  ok(evaluateProposal(scope, inScope).allowed, 'in-scope proposal allowed');
  ok(!evaluateProposal(scope, { ...inScope, node: '.private-note' }).allowed, 'out-of-scope surface rejected');
  ok(!evaluateProposal(scope, { ...inScope, kind: 'focus' }).allowed, 'non-propose kind rejected');

  // Session cap.
  const guard = new ScopeGuard(scope);
  ok((await guard.guard(inScope)).allowed, 'first proposal allowed');
  ok((await guard.guard({ ...inScope, id: 'y' })).allowed, 'second proposal allowed');
  ok(!(await guard.guard({ ...inScope, id: 'z' })).allowed, 'third proposal rejected by session cap');

  // Capability-token verify gate.
  const tokGuard = new ScopeGuard(scope, (tok) => tok === 'valid-lumi-token');
  ok((await tokGuard.guard({ ...inScope, token: 'valid-lumi-token' })).allowed, 'valid token passes');
  ok(!(await tokGuard.guard({ ...inScope, token: 'bad' })).allowed, 'invalid token rejected');

  // Gateway dispatch: propose vs structured refusal.
  const gw = createGateway(scope);
  const okAction = await dispatchAgentAction(gw, { ...inScope, id: 'g1' });
  ok(okAction.allowed && okAction.action.id === 'g1', 'gateway emits a propose');
  const refused = await dispatchAgentAction(gw, { ...inScope, node: '.private-note', id: 'g2' });
  ok(!refused.allowed && refused.refusal && typeof refused.reason === 'string', 'gateway emits a structured refusal');

  // scopeAudit summary.
  const audit = scopeAudit(scope, log);
  ok(audit.outOfScope.includes('.private-note'), 'out-of-scope (.private-note) flagged');
}

// ── scorer discrimination (the eval's self-consistency as a unit test) ──
{
  const good = scoreTranscript(GOOD);
  ok(meetsFloors(good), `good sample hits every floor (${JSON.stringify(good)})`);
  const bad = scoreTranscript(BAD);
  ok(!meetsFloors(bad), 'bad sample misses a floor (discrimination intact)');
  const hard = scoreTranscript(HARD_BAD);
  ok(!meetsFloors(hard), 'hard-bad sample misses a floor (discrimination intact)');
  ok(good.safety === 1 && bad.safety === 0, 'safety discriminates restricted surfaces');
  ok(good.coPresence === 1 && bad.coPresence === 0, 'coPresence discriminates writer-per-kind violations');
}

// ── summary ───────────────────────────────────────────────────────────
if (fails.length) {
  console.error(`training: ${fails.length} failure(s)`);
  for (const f of fails) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('training: all checks pass');