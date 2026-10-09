/**
 * orchestrator.test.mjs — negative controls for the orthogonal-researcher core.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateDomainTable,
  checkMece,
  validateFanOut,
  validateResearchNote,
  aggregateFindings,
} from '../research/orchestrator.mjs';

const GOOD_TABLE = [
  { domain: 'voices', variant: 'social power users', assigned_model: 'glm-4.7-flash', prompt_template: '…' },
  { domain: 'failures', variant: 'postmortems', assigned_model: 'glm-4.7-flash', prompt_template: '…' },
  { domain: 'data', variant: 'market numbers', assigned_model: 'glm-4.7-flash', prompt_template: '…' },
];

test('domain table: empty or missing fields fail validation', () => {
  assert.equal(validateDomainTable([]).ok, false);
  assert.equal(validateDomainTable([{ domain: 'x' }]).ok, false, 'missing variant/model/template');
  assert.equal(validateDomainTable(GOOD_TABLE).ok, true);
});

test('mece: overlapping domains are flagged', () => {
  const overlapping = [
    { domain: 'enterprise adoption', variant: 'success stories', assigned_model: 'x', prompt_template: '…' },
    { domain: 'enterprise adoption', variant: 'failure stories', assigned_model: 'x', prompt_template: '…' },
  ];
  const r = checkMece(overlapping);
  assert.equal(r.ok, false, 'same domain → not MECE');
  assert.equal(checkMece(GOOD_TABLE).ok, true, 'disjoint domains → MECE');
});

test('fanout: 6 agents without independence proof fails; with proof passes', () => {
  const six = Array.from({ length: 6 }, (_, i) => ({ domain: `d${i}`, variant: 'v', assigned_model: 'x', prompt_template: '…' }));
  assert.equal(validateFanOut(six).ok, false, '6 > 5 ceiling without proof');
  assert.equal(validateFanOut(six, { independenceProven: true }).ok, true);
  assert.equal(validateFanOut(GOOD_TABLE).ok, true);
});

test('note: file-backed return must exist, be non-empty, and have a title', () => {
  assert.equal(validateResearchNote(null, { readNote: () => '# ok' }).ok, false, 'no path');
  assert.equal(validateResearchNote('n.md', { readNote: () => null }).ok, false, 'missing file');
  assert.equal(validateResearchNote('n.md', { readNote: () => '' }).ok, false, 'empty');
  assert.equal(validateResearchNote('n.md', { readNote: () => 'no title here' }).ok, false, 'no title');
  assert.equal(validateResearchNote('n.md', { readNote: () => '# A note\n\ncontent' }).ok, true);
});

test('aggregate: same-root sources collapse; echo drops n_eff', () => {
  const findings = [
    { claim: 'market is growing', sources: ['https://press.example/x', 'https://press.example/x?utm=1'], confidence: 0.9 },
    { claim: 'market is growing', sources: ['https://independent.example/y'], confidence: 0.8 },
  ];
  const { claims } = aggregateFindings(findings);
  assert.equal(claims.length, 1);
  assert.equal(claims[0].nominal_sources, 3);
  assert.equal(claims[0].independent_warrants, 2, 'press.example ×2 collapses to one warrant');
  assert.ok(claims[0].n_eff < 3, 'echo lowers the effective sample size');
  assert.equal(claims[0].confidence, 0.85);
});

test('aggregate: distinct claims stay distinct', () => {
  const findings = [
    { claim: 'claim A', sources: ['https://a.example'], confidence: 0.5 },
    { claim: 'claim B', sources: ['https://b.example'], confidence: 0.6 },
  ];
  assert.equal(aggregateFindings(findings).claims.length, 2);
});