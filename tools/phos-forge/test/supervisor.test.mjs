/**
 * supervisor.test.mjs — negative controls for the deterministic supervisor loop
 * and the writer-from-ledger bridge.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { nextAction, pruneTurnAtomic, shouldSummarize, writerContext } from '../research/orchestrator.mjs';
import { ResearchLedger } from '../research/ledger.mjs';

test('nextAction: saturation always wins', () => {
  assert.equal(nextAction({ saturated: true, contextTokens: 100, tokenBudget: 1000, completedSubgoals: 0 }), 'stop');
});

test('nextAction: prune beats summarize when over budget', () => {
  const a = nextAction({ saturated: false, contextTokens: 2000, tokenBudget: 1000, completedSubgoals: 10 });
  assert.equal(a, 'prune', 'over budget → prune, even with subgoals to summarize');
});

test('nextAction: summarize fires above threshold, continue below', () => {
  assert.equal(nextAction({ saturated: false, contextTokens: 100, tokenBudget: 1000, completedSubgoals: 5 }), 'summarize');
  assert.equal(nextAction({ saturated: false, contextTokens: 100, tokenBudget: 1000, completedSubgoals: 4 }), 'continue');
});

test('pruneTurnAtomic: never breaks a tool-call/tool-result pair', () => {
  // Each turn is [assistant-tool-call, tool_result]. A naive trim would split a
  // pair; turn-atomic keeps whole turns only.
  const turn = (n) => [
    { role: 'assistant', content: `tool call ${n} ` + 'x'.repeat(40) },
    { role: 'tool', content: `result ${n} ` + 'y'.repeat(40) },
  ];
  const turns = [turn(1), turn(2), turn(3)];
  const { kept } = pruneTurnAtomic(turns, 20); // tiny budget → only newest turn kept whole
  assert.equal(kept.length, 1, 'only the newest whole turn fits');
  assert.equal(kept[0].length, 2, 'the kept turn is complete (call + result), not split');
  assert.equal(kept[0][0].role, 'assistant');
  assert.equal(kept[0][1].role, 'tool');
});

test('pruneTurnAtomic: keeps at least one turn even under a zero budget', () => {
  const turn = [{ role: 'assistant', content: 'a' }, { role: 'tool', content: 'b' }];
  const { kept } = pruneTurnAtomic([turn], 0);
  assert.equal(kept.length, 1, 'never drop below one turn');
});

test('shouldSummarize: threshold is deterministic', () => {
  assert.equal(shouldSummarize(5).shouldSummarize, true);
  assert.equal(shouldSummarize(4).shouldSummarize, false);
});

test('writerContext: drafts from source-linked claims, not prose', () => {
  const l = new ResearchLedger('2026-10-04');
  l.addClaim('the market is growing', { sources: ['https://a.example/x'], confidence: 0.9, tier: 'primary' });
  l.addClaim('churn is falling', { sources: ['https://b.example/x'], confidence: 0.7, tier: 'established' });
  l.addGap('unanswered: cohort retention', { priority: 'high' });

  const ctx = writerContext(l);
  assert.equal(ctx.as_of, '2026-10-04');
  assert.equal(ctx.sections[0].claims.length, 2, 'two claims land in the structure');
  assert.equal(ctx.sections[0].claims[0].claim, 'the market is growing');
  assert.equal(ctx.sections[0].claims[0].sources[0], 'https://a.example/x');
  assert.equal(ctx.gaps.length, 1, 'gaps are carried to the writer');
});

test('writerContext: groups claims when a groupBy fn is supplied', () => {
  const l = new ResearchLedger();
  l.addClaim('a', { sources: ['x'], tier: 'primary' });
  l.addClaim('b', { sources: ['y'], tier: 'established' });
  const ctx = writerContext(l, { groupBy: (c) => c.tier });
  assert.equal(ctx.sections.length, 2, 'claims split by tier');
  assert.equal(ctx.sections[0].heading, 'primary');
});