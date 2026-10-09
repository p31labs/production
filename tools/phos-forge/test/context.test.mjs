/**
 * context.test.mjs — negative controls for lossless trimming + closed-loop
 * compaction, plus localized revision and real-usage accounting.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { stripMechanicalBloat, trimReport, commitCompaction } from '../research/context.mjs';
import { diffLedger, ResearchLedger } from '../research/ledger.mjs';
import { recordUsage, NeuronBudget } from '../research/neurons.mjs';

test('stripMechanicalBloat: preserves user + assistant text verbatim', () => {
  const msgs = [
    { role: 'user', content: 'research the market size' },
    { role: 'assistant', content: 'The market is $4.2B per the report.' },
  ];
  const out = stripMechanicalBloat(msgs);
  assert.equal(out[0].content, 'research the market size');
  assert.equal(out[1].content, 'The market is $4.2B per the report.');
  assert.equal(out[0].trimmed, undefined, 'user text not flagged');
  assert.equal(out[1].trimmed, undefined, 'assistant text not flagged');
});

test('stripMechanicalBloat: strips raw tool output and base64', () => {
  const msgs = [
    { role: 'assistant', content: 'done' },
    { role: 'tool', content: 'x'.repeat(5000) }, // raw tool output
    { role: 'user', content: 'data:image/png;base64,AAAA...embedded...' },
  ];
  const out = stripMechanicalBloat(msgs);
  assert.equal(out[1].content, '[tool output trimmed]');
  assert.ok(out[2].content.includes('[image]'), 'base64 stripped');
  assert.ok(!out[2].content.includes('base64'), 'no base64 payload survives');
});

test('stripMechanicalBloat: tool-call arguments are trimmed, name kept', () => {
  const msgs = [
    { role: 'assistant', content: null, tool_calls: [{ function: { name: 'web_search', arguments: '{"query":"' + 'x'.repeat(4000) + '"}' } }] },
  ];
  const out = stripMechanicalBloat(msgs);
  assert.equal(out[0].tool_calls[0].function.name, 'web_search');
  assert.equal(out[0].tool_calls[0].function.arguments, '[arguments trimmed]');
});

test('trimReport: reports the token reduction', () => {
  const before = [{ role: 'tool', content: 'x'.repeat(4000) }];
  const after = stripMechanicalBloat(before);
  const r = trimReport(before, after);
  assert.ok(r.before > r.after, 'trim must reduce tokens');
  assert.ok(r.savedPct > 0);
});

test('commitCompaction: a failed proposal rolls back to the previous history', () => {
  const prev = [{ role: 'user', content: 'original' }];
  const bad = [{ role: 'user', content: 'summarized' }];
  const r = commitCompaction(prev, bad, () => false); // validator rejects
  assert.equal(r.ok, false);
  assert.equal(r.rolledBack, true);
  assert.equal(r.history, prev, 'previous history returned unchanged');
});

test('commitCompaction: a valid proposal commits', () => {
  const prev = [{ role: 'user', content: 'original' }];
  const good = [{ role: 'user', content: 'summarized' }];
  const r = commitCompaction(prev, good, () => true);
  assert.equal(r.ok, true);
  assert.equal(r.history, good);
  assert.equal(r.previous, prev);
});

test('diffLedger: returns only added/removed/changed claims', () => {
  const prev = new ResearchLedger();
  prev.addClaim('the market is growing', { sources: ['https://a.example/x'], confidence: 0.9 });
  prev.addClaim('churn is falling', { sources: ['https://b.example/x'], confidence: 0.7 });

  const next = ResearchLedger.fromJSON(JSON.parse(JSON.stringify(prev)));
  next.addClaim('a brand new fact', { sources: ['https://c.example/x'], confidence: 0.5 });
  next.verified_claims[0].confidence = 0.95; // changed confidence

  const d = diffLedger(prev, next);
  assert.equal(d.added.length, 1, 'one added claim');
  assert.equal(d.changed.length, 1, 'one changed claim');
  assert.equal(d.changed[0].before.confidence, 0.9);
  assert.equal(d.changed[0].after.confidence, 0.95);
  assert.equal(d.removed.length, 0);
});

test('recordUsage: feeds real token counts into the budget', () => {
  const b = new NeuronBudget(10000);
  const r = recordUsage(
    { prompt_tokens: 2000, completion_tokens: 500, prompt_tokens_details: { cached_tokens: 1800 } },
    '@cf/zai-org/glm-4.7-flash',
    b,
  );
  assert.ok(r.estimate > 0, 'estimate is a real number');
  assert.equal(r.promptTokens, 2000);
  assert.equal(r.completionTokens, 500);
  assert.equal(r.cachedTokens, 1800, 'cached tokens surfaced for observability');
  assert.equal(r.used, r.estimate, 'budget advanced by the estimate');
});