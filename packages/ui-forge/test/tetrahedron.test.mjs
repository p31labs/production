import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ground, socraticQuestions, parseBackendSpec } from '../src/grounder.mjs';
import { shape, auditTree } from '../src/shaper.mjs';
import { scoreCandidate, selectSurvivors, treeDist, classifyAdmissibility } from '../src/governor.mjs';
import { forge } from '../src/center.mjs';
import { runGate } from '../src/gate.mjs';
import { AXES } from '../src/gate.mjs';

test('grounder extracts facts and flags gaps', () => {
  const spec = {
    entities: [
      { name: 'spoon', fields: [{ name: 'level', type: 'number' }, { name: 'note', type: 'string' }] },
    ],
    actions: [{ name: 'logSpoon' }],
  };
  const g = ground(spec);
  assert.equal(g.facts.filter((f) => f.kind === 'entity').length, 1);
  assert.equal(g.facts.filter((f) => f.kind === 'field').length, 2);
  assert.equal(g.facts.filter((f) => f.kind === 'action').length, 1);
  // 'logSpoon' has no trigger → gap.
  assert.ok(g.gaps.some((gap) => gap.kind === 'action-trigger'));
});

test('socratic questions rank gaps by gain minus lambda cost', () => {
  const spec = { entities: [{ name: 'x', fields: [{ name: 'y', type: 'weird-type' }] }] };
  const { gaps } = parseBackendSpec(spec);
  const qs = socraticQuestions(gaps, 2);
  assert.ok(qs.length >= 1);
  assert.ok(qs[0].question.length > 10);
  assert.match(qs[0].question, /y/);
});

test('shaper repairs enum violations, drops undeclared props and bad tokens', () => {
  const bad = {
    type: 'Button',
    props: { variant: 'neon-slop', children: 'Save' },
    tokens: ['p31.color.action.primary', 'color.red'],
    children: [{ type: 'NoSuchComponent' }],
  };
  const audit = auditTree(bad);
  assert.ok(audit.some((i) => i.code === 'enum-violation'));
  assert.ok(audit.some((i) => i.code === 'non-p31-token'));
  assert.ok(audit.some((i) => i.code === 'unknown-type'));

  const { tree } = shape(bad);
  assert.ok(tree);
  // variant clamped to first enum value (primary).
  assert.equal(tree.props.variant, 'primary');
  // non-p31 token dropped; unknown child dropped.
  assert.deepEqual(tree.tokens, ['p31.color.action.primary']);
  assert.equal(tree.children, undefined);
});

test('governor scores structure, token use, and binding', () => {
  const goodTree = {
    type: 'Card',
    props: { title: 'Spoon level' },
    tokens: ['p31.surface.bg'],
    dataBinding: 'spoon.level',
    children: [{ type: 'MetricBadge', props: { label: 'Level' } }],
  };
  const grounded = { entities: [{ name: 'spoon', fields: [{ name: 'level' }] }], actions: [] };
  const audit = auditTree(goodTree);
  assert.deepEqual(audit, [], 'good tree has no audit issues');
  const score = scoreCandidate(goodTree, audit, grounded);
  assert.ok(score.total > 0.8, `expected high total, got ${score.total}`);
});

test('selectSurvivors keeps diverse candidates and kills similar ones', () => {
  const a = { type: 'Card', props: { title: 'A' } };
  const a2 = { type: 'Card', props: { title: 'A2' } }; // same signature → near-identical
  const b = { type: 'SidebarNav', props: {} };
  const scored = [
    { tree: a, score: { total: 0.9 } },
    { tree: a2, score: { total: 0.85 } },
    { tree: b, score: { total: 0.8 } },
  ];
  const { survivors, kills } = selectSurvivors(scored, 2);
  assert.equal(survivors.length, 2);
  assert.ok(kills.length >= 1);
  assert.ok(treeDist(a, a2) < treeDist(a, b));
});

test('center.forge runs the full tetrahedron with a stubbed dreamer', async () => {
  const spec = { title: 'Spoon Tracker', entities: [{ name: 'spoon', fields: [{ name: 'level', type: 'number' }] }], actions: [] };
  const provider = async () => JSON.stringify([
    {
      id: 'root',
      type: 'GlassPanel',
      props: {},
      tokens: ['p31.glass.bg'],
      children: [{ type: 'MetricBadge', props: { label: 'Level' }, dataBinding: 'spoon.level' }],
    },
    {
      id: 'root',
      type: 'Card',
      props: { title: 'Level' },
      tokens: ['p31.surface.bg'],
      dataBinding: 'spoon.level',
    },
  ]);
  const reviews = AXES.map((axis) => ({ axis, mean: 7, verdict: 'pass', findings: [] }));
  const report = await forge(spec, { k: 2, provider, reviews });
  assert.equal(report.logs.candidates, 4, '2 dreamer + 2 catalog-walk trees in the pool');
  assert.equal(report.logs.admissible, 4, 'all candidates pass the non-compensatory admissibility gate');
  assert.equal(report.logs.survivors, 2);
  assert.ok(report.artifact, 'artifact produced');
  assert.equal(report.gate.status, 'pass');
  assert.ok(report.propose, 'Loom propose event emitted');
  assert.equal(report.propose.kind, 'propose');
  assert.deepEqual(report.nextGate, [], 'a passing gate names no next step');
});

test('center.forge reports a failed gate when reviews are bad', async () => {
  const spec = { title: 'X', entities: [{ name: 'a' }], actions: [] };
  const provider = async () => JSON.stringify([{ id: 'root', type: 'GlassPanel', props: { title: 'A' }, tokens: ['p31.color.action.primary'] }]);
  const reviews = AXES.map((axis) => ({ axis, mean: axis === 'sensory-safety' ? 1 : 7, verdict: axis === 'sensory-safety' ? 'fail' : 'pass', findings: [] }));
  const report = await forge(spec, { k: 1, provider, reviews });
  assert.equal(report.gate.status, 'incomplete');
  assert.deepEqual(report.gate.collapsedAxes, ['sensory-safety']);
});

test('runGate rejects with 502-style failed reviews? No — runGate is pure, gate is orthogonal', () => {
  const reviews = AXES.map((axis) => ({ axis, mean: 5, verdict: 'fail', findings: [{ axis, severity: 'major', issue: 'minor issue' }] }));
  const gate = runGate(reviews);
  assert.equal(gate.status, 'needs-revision');
});

test('governor is non-compensatory: a clean-but-unbound candidate is inadmissible', () => {
  const grounded = { entities: [{ name: 'spoon', fields: [{ name: 'level' }] }], actions: [] };
  const cleanUnbound = { tree: { type: 'Card', props: { title: 'X' } }, audit: [] };
  const { admissible, inadmissible } = classifyAdmissibility([cleanUnbound], grounded);
  assert.equal(admissible.length, 0, 'no dataBinding → inadmissible despite clean structure');
  assert.equal(inadmissible.length, 1);
  assert.match(inadmissible[0].reason, /no grounded entity/);
});

test('selectSurvivors uses reward as a tie-break among equal scores', () => {
  // Two candidates with identical structural score — the higher reward wins.
  const a = { tree: { type: 'Card', props: { title: 'A' } }, score: { total: 0.8 }, reward: 0.9 };
  const b = { tree: { type: 'Card', props: { title: 'B' } }, score: { total: 0.8 }, reward: 0.4 };
  const { survivors } = selectSurvivors([a, b], 2);
  assert.equal(survivors[0], a, 'higher reward breaks the tie');
});

test('selectSurvivors ignores reward when scores differ (reward never vetoes)', () => {
  const low = { tree: { type: 'Card', props: { title: 'L' } }, score: { total: 0.9 }, reward: 0.1 };
  const high = { tree: { type: 'Card', props: { title: 'H' } }, score: { total: 0.6 }, reward: 0.99 };
  const { survivors } = selectSurvivors([low, high], 2);
  assert.equal(survivors[0], low, 'structural score dominates; reward only breaks ties');
});

test('center.forge names the next gate when an axis collapses', async () => {
  const spec = { title: 'X', entities: [{ name: 'a', fields: [{ name: 'v', type: 'number' }] }], actions: [] };
  const provider = async () => JSON.stringify([
    { id: 'root', type: 'Card', props: { title: 'A' }, tokens: ['p31.surface.bg'], dataBinding: 'a.v' },
  ]);
  // Sensory-safety collapsed → the Center must name "reduce ambient opacity".
  const reviews = AXES.map((axis) => ({ axis, mean: axis === 'sensory-safety' ? 1 : 7, verdict: axis === 'sensory-safety' ? 'fail' : 'pass', findings: [] }));
  const report = await forge(spec, { k: 1, provider, reviews });
  assert.equal(report.gate.status, 'incomplete');
  assert.ok(report.nextGate.length >= 1, 'nextGate names the collapsed axis');
  assert.ok(report.nextGate.some((n) => n.axis === 'sensory-safety'));
  assert.match(report.nextGate.find((n) => n.axis === 'sensory-safety').action, /ambient opacity/);
});
test('center.forge emits a real gate.verdict when no /vision reviews are supplied', async () => {
  const spec = { title: 'Spoon Tracker', entities: [{ name: 'spoon' }], actions: [] };
  const provider = async () => JSON.stringify([{ id: 'root', type: 'Card', props: { title: 'Level' }, tokens: ['p31.surface.bg'], dataBinding: 'spoon.level', children: [{ id: 'btn', type: 'Button', props: { label: 'Open' }, dataBinding: 'spoon.level' }] }]);
  const events = [];
  const report = await forge(spec, { k: 2, provider, emit: (e) => events.push(e) });
  const verdict = events.find((e) => e.type === 'gate.verdict');
  assert.ok(verdict, 'gate.verdict event emitted');
  assert.equal(verdict.status, report.gate.status, 'event status matches the report');
  assert.notEqual(verdict.status, 'not-run', 'verdict is real, not not-run');
  assert.ok(verdict.axes, 'verdict carries the axis state');
});

test('center.forge deterministic gate: a canon-clean bound interactive artifact passes', async () => {
  const spec = { title: 'Spoon Tracker', entities: [{ name: 'spoon' }], actions: [] };
  const provider = async () => JSON.stringify([{ id: 'root', type: 'Card', props: { title: 'Level' }, tokens: ['p31.surface.bg'], dataBinding: 'spoon.level', children: [{ id: 'btn', type: 'Button', props: { label: 'Open' }, dataBinding: 'spoon.level' }] }]);
  const report = await forge(spec, { k: 1, provider });
  assert.equal(report.gate.status, 'pass', 'canon-clean + bound + interactive artifact passes the deterministic gate');
  assert.deepEqual(report.nextGate, [], 'a passing gate names no next step');
});

test('center.forge deterministic gate: an unbound fallback artifact does NOT pass', async () => {
  const spec = { title: 'Empty', entities: [], actions: [] };
  const provider = async () => '[]';
  const report = await forge(spec, { k: 1, provider });
  assert.ok(report.gate, 'gate ran without /vision reviews');
  assert.ok(['incomplete', 'needs-revision'].includes(report.gate.status), 'unbound artifact cannot pass: ' + report.gate.status);
});
