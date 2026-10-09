import { test } from 'node:test';
import assert from 'node:assert/strict';
import { levenshtein, nearestToken, nearestBinding, coerceType } from '../src/repair.mjs';
import { forge } from '../src/center.mjs';

test('levenshtein computes standard edit distance', () => {
  assert.equal(levenshtein('kitten', 'sitting'), 3);
  assert.equal(levenshtein('', 'abc'), 3);
  assert.equal(levenshtein('abc', ''), 3);
  assert.equal(levenshtein('same', 'same'), 0);
  assert.equal(levenshtein('spoons', 'spoon'), 1);
  assert.equal(levenshtein('a', 'b'), 1);
});

test('nearestToken substitutes a near-match and refuses a real miss', () => {
  const allowed = new Set(['glass.bg', 'p31.glass.bg', 'p31.glass.blur', 'p31.glass.border']);
  assert.equal(nearestToken('p31.glas.bg', allowed), 'p31.glass.bg');
  assert.equal(nearestToken('p31.glas.blur', allowed), 'p31.glass.blur');
  assert.equal(nearestToken('totally-bogus', allowed), null);
  assert.equal(nearestToken('p31.glass.bg', allowed), 'p31.glass.bg'); // exact stays exact
});

test('coerceType coerces the three primitive cases', () => {
  assert.equal(coerceType('3', 'number'), 3);
  assert.equal(coerceType('3.5', 'number'), 3.5);
  assert.equal(coerceType('true', 'boolean'), true);
  assert.equal(coerceType('false', 'boolean'), false);
  assert.equal(coerceType(3, 'string'), '3');
  assert.equal(coerceType(true, 'string'), 'true');
  assert.equal(coerceType('not-a-number', 'number'), 'not-a-number'); // never a destructive cast
});

test('nearestBinding aligns a near-miss ref to a grounded name', () => {
  const grounded = { entities: [{ name: 'spoon' }], actions: [] };
  assert.equal(nearestBinding('spoons', grounded), 'spoon');
  assert.equal(nearestBinding('sponn', grounded), 'spoon');
  assert.equal(nearestBinding('sp', grounded), 'spoon'); // unambiguous prefix
  assert.equal(nearestBinding('poon', grounded), 'spoon'); // substring of exactly one
  assert.equal(nearestBinding('spoon', grounded), 'spoon'); // exact stays exact
});

test('nearestBinding never invents a binding', () => {
  const grounded = { entities: [{ name: 'spoon' }], actions: [] };
  assert.equal(nearestBinding('widget', grounded), null);
  assert.equal(nearestBinding('zzz', grounded), null);
  // ambiguous prefix → no single name → null
  const multi = { entities: [{ name: 'spoon' }, { name: 'spoonful' }], actions: [] };
  assert.equal(nearestBinding('sp', multi), null);
  // nothing grounded at all → null
  assert.equal(nearestBinding('spoons', { entities: [], actions: [] }), null);
});

test('center.forge T4 fallback: zero admissible candidates still yields an artifact', async () => {
  const spec = { title: 'Unbound', entities: [{ name: 'a' }], actions: [] };
  // The dreamer returns a candidate with NO dataBinding → inert after shaping,
  // but the deterministic catalog-walk pool (always appended) stays admissible.
  const provider = async () => JSON.stringify([{ id: 'root', type: 'Card', props: { title: 'X' } }]);
  const report = await forge(spec, { k: 1, provider });
  assert.ok(report.logs.admissible >= 1, 'catalog-walk trees keep the pool admissible');
  assert.ok(report.artifact, 'artifact produced (catalog-walk, never nothing)');
  assert.equal(report.fellBack, false, 'catalog-walk trees are admissible; no T4 needed');
  assert.equal(report.tier, 'catalog-walk', 'the winning tree came from the canonical walk');
  assert.ok(report.artifact.type, 'artifact has a renderable type');
});

test('center.forge T0 intent: a spec with no entities/actions still returns an artifact', async () => {
  const spec = { title: 'Empty brief' };
  // Dreamer returns nothing usable → the deterministic catalog-walk kicks in.
  const provider = async () => '[]';
  const report = await forge(spec, { k: 2, provider });
  assert.ok(report.artifact, 'artifact produced from a default brief');
  assert.equal(report.fellBack, false, 'catalog-walk trees are admissible; no T4 needed');
  assert.equal(report.logs.groundedFacts >= 3, true, 'item entity + open/save actions grounded');
  assert.ok(report.logs.survivors >= 1);
});

test('center.forge repairs a typo binding instead of killing the candidate', async () => {
  const spec = { title: 'Spoon Tracker', entities: [{ name: 'spoon' }], actions: [] };
  // "spons.level" is a typo of "spoon.level" — the Governor aligns it.
  const provider = async () => JSON.stringify([{ id: 'root', type: 'Card', props: { title: 'Level' }, dataBinding: 'spons.level' }]);
  const report = await forge(spec, { k: 1, provider });
  assert.ok(report.logs.admissible >= 1, 'the typo binding is repaired, not killed');
  assert.ok(report.logs.survivors >= 1);
  // At least one survivor's tree surfaces the grounded entity via dataBinding.
  const bound = report.survivors.some((s) => String(s.tree?.dataBinding ?? '').includes('spoon'));
  assert.ok(bound, 'a survivor tree binds to the grounded entity');
});

test('center.forge emits pipeline events', async () => {
  const spec = { title: 'Spoon Tracker', entities: [{ name: 'spoon' }], actions: [] };
  const provider = async () => JSON.stringify([{ id: 'root', type: 'Card', props: { title: 'Level' }, dataBinding: 'spoon.level' }]);
  const events = [];
  const report = await forge(spec, { k: 1, provider, emit: (e) => events.push(e) });
  const types = new Set(events.map((e) => e.type));
  assert.ok(types.has('pipeline.stage'));
  assert.ok(types.has('agent.start'));
  assert.ok(types.has('agent.done'));
  assert.ok(types.has('artifact.final'));
  assert.ok(events.some((e) => e.type === 'artifact.final' && e.artifact === report.artifact));
  const starts = events.filter((e) => e.type === 'pipeline.stage' && e.phase === 'start');
  const dones = events.filter((e) => e.type === 'pipeline.stage' && e.phase === 'done');
  assert.equal(starts.length, dones.length, 'every stage start has a matching done');
  assert.ok(starts.length >= 5, 'intent/ground/dream/repair/gate stages');
});