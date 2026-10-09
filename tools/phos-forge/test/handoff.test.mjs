/**
 * handoff.test.mjs — the convergence-point negative controls.
 *
 * Proves the handoff block round-trips and that a report with a block feeds
 * the tetrahedron (reportToSpec → forge). A gate that cannot fail is furniture:
 * each check here asserts BOTH the pass and the fail direction.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateHandoffBlock,
  extractHandoffBlock,
  reportToSpec,
  validateHandoff,
} from '../handoff.mjs';

const SAMPLE_META = {
  reportId: 'p31_research_spoon_tracker_20261004_v1.0',
  title: 'Spoon Tracker',
  entities: [
    { name: 'spoon', fields: [{ name: 'level', type: 'number' }, { name: 'state', type: 'string' }] },
  ],
  actions: [{ name: 'logSpoon' }, { name: 'viewHistory' }],
  constraints: ['calm-mode:true', 'spoon-aware:true'],
  gaps: ['time-series granularity unspecified'],
  sources: 12,
  confidence: 0.87,
};

test('handoff block round-trips exactly', () => {
  const block = generateHandoffBlock(SAMPLE_META);
  const parsed = extractHandoffBlock(`# Report\n\n${block}\n\n## Body`);
  assert.ok(parsed, 'block must parse');
  assert.equal(parsed.reportId, SAMPLE_META.reportId);
  assert.equal(parsed.title, SAMPLE_META.title);
  assert.equal(parsed.entities.length, 1);
  assert.equal(parsed.entities[0].name, 'spoon');
  assert.equal(parsed.entities[0].fields.length, 2);
  assert.equal(parsed.entities[0].fields[0].name, 'level');
  assert.equal(parsed.entities[0].fields[0].type, 'number');
  assert.equal(parsed.actions.length, 2);
  assert.equal(parsed.constraints.length, 2);
  assert.equal(parsed.gaps.length, 1);
  assert.equal(parsed.sources, 12);
  assert.equal(parsed.confidence, 0.87);
});

test('reportToSpec produces a forge-ready spec from the block', () => {
  const block = generateHandoffBlock(SAMPLE_META);
  const spec = reportToSpec(`# Report\n\n${block}\n\n## Body`);
  assert.equal(spec.title, 'Spoon Tracker');
  assert.equal(spec.entities.length, 1);
  assert.equal(spec.entities[0].name, 'spoon');
  assert.equal(spec.actions.length, 2);
  assert.ok(spec.handoff, 'spec must carry the parsed handoff');
});

test('reportToSpec degrades gracefully with no block', () => {
  const spec = reportToSpec('# My Report\n\nBody without a block.');
  assert.equal(spec.title, 'My Report');
  assert.deepEqual(spec.entities, []);
  assert.equal(spec.handoff, null);
});

test('validateHandoff rejects an incomplete block', () => {
  assert.equal(validateHandoff(null).ok, false);
  assert.equal(validateHandoff({ reportId: 'x', entities: [] }).ok, false, 'no entities');
  assert.equal(validateHandoff({ entities: [{ name: 'a', fields: [] }] }).ok, false, 'missing report_id');
  const good = extractHandoffBlock(generateHandoffBlock(SAMPLE_META));
  assert.equal(validateHandoff(good).ok, true);
});