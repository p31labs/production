import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  runGate,
  toStateVector,
  collapsedAxes,
  corroboratedCriticalFindings,
  beliefDelta,
  atEquilibrium,
  AXES,
} from '../src/gate.mjs';

const axes = AXES;

function allPassing(reviews) {
  // mean 7+ on every axis, no findings → pass
  return axes.map((axis) => ({ axis, mean: 7, verdict: 'pass', findings: [] }));
}

test('a complete review with no findings passes', () => {
  const r = runGate(allPassing([]));
  assert.equal(r.status, 'pass');
  for (const a of axes) assert.ok(r.state[a] >= 0.4);
});

test('a collapsed axis → incomplete, names the axis', () => {
  const reviews = allPassing([]).map((r) => (r.axis === 'sensory-safety' ? { ...r, mean: 1, verdict: 'fail' } : r));
  const r = runGate(reviews);
  assert.equal(r.status, 'incomplete');
  assert.deepEqual(r.collapsedAxes, ['sensory-safety']);
});

test('a missing axis counts as zero mass (informational completeness)', () => {
  const reviews = allPassing([]).filter((r) => r.axis !== 'motion-interaction');
  const state = toStateVector(reviews);
  assert.equal(state['motion-interaction'], 0);
  const r = runGate(reviews);
  assert.equal(r.status, 'incomplete');
  assert.ok(r.collapsedAxes.includes('motion-interaction'));
});

test('a single-lone critical finding does NOT gate (1/3-overlap rule)', () => {
  const reviews = allPassing([]).map((r) =>
    r.axis === 'layout-parity'
      ? {
          ...r,
          mean: 6,
          findings: [{ axis: 'layout-parity', severity: 'critical', issue: 'rail is a moved-down topbar' }],
        }
      : r,
  );
  const r = runGate(reviews);
  // One critic → not corroborated → still passes (no corroborated critical).
  assert.equal(r.status, 'pass');
});

test('a critical finding corroborated by two specialists → needs-revision', () => {
  const reviews = allPassing([]).map((r) =>
    r.axis === 'layout-parity' || r.axis === 'identity-surface'
      ? {
          ...r,
          mean: 5.5,
          findings: [
            { axis: r.axis, severity: 'critical', issue: 'brand mark is invisible at tertiary contrast' },
          ],
        }
      : r,
  );
  const r = runGate(reviews);
  assert.equal(r.status, 'needs-revision');
  assert.ok(r.issues.some((i) => i.includes('brand mark')));
  assert.ok(r.issues.some((i) => i.includes('layout-parity, identity-surface') || i.includes('identity-surface, layout-parity')));
});

test('corroboratedCriticalFindings requires minCorroborators independently', () => {
  const reviews = allPassing([]).map((r) =>
    r.axis === 'layout-parity' || r.axis === 'sensory-safety'
      ? {
          ...r,
          findings: [{ axis: r.axis, severity: 'critical', issue: 'X' }],
        }
      : r,
  );
  const corroborated = corroboratedCriticalFindings(reviews, 2);
  assert.equal(corroborated.length, 1);
  assert.deepEqual(corroborated[0].axes.sort(), ['layout-parity', 'sensory-safety']);
  // With 3 required, it no longer gates.
  assert.equal(corroboratedCriticalFindings(reviews, 3).length, 0);
});

test('beliefDelta + atEquilibrium implement the QBism halt rule', () => {
  const a = { 'layout-parity': 0.5, 'sensory-safety': 0.6, 'identity-surface': 0.7, 'motion-interaction': 0.8 };
  const b = { 'layout-parity': 0.5, 'sensory-safety': 0.6, 'identity-surface': 0.7, 'motion-interaction': 0.8 };
  assert.equal(beliefDelta(a, b), 0);
  assert.ok(atEquilibrium(a, b, 0.05));

  const c = { 'layout-parity': 0.9, 'sensory-safety': 0.6, 'identity-surface': 0.7, 'motion-interaction': 0.8 };
  const d = beliefDelta(a, c);
  assert.ok(d > 0.3, `expected large delta, got ${d}`);
  assert.ok(!atEquilibrium(a, c, 0.05));
});

test('major findings below corroboration still force needs-revision', () => {
  const reviews = allPassing([]).map((r) =>
    r.axis === 'motion-interaction'
      ? {
          ...r,
          mean: 5,
          findings: [{ axis: 'motion-interaction', severity: 'major', issue: 'composer missing loading state' }],
        }
      : r,
  );
  const r = runGate(reviews);
  assert.equal(r.status, 'needs-revision');
  assert.ok(r.issues.some((i) => i.includes('composer missing loading state')));
});

test('a degraded axis → needs-review, not a silent pass (QBism instrument-fault)', () => {
  // All axes above floor, but sensory-safety was measured with a degraded
  // instrument (e.g. /vision fell back models/rubric, or returned neutral).
  const reviews = allPassing([]).map((r) =>
    r.axis === 'sensory-safety'
      ? { ...r, mean: 7, degraded: true }
      : r,
  );
  const g = runGate(reviews);
  assert.equal(g.status, 'needs-review');
  assert.deepEqual(g.degradedAxes, ['sensory-safety']);
});

test('degraded + collapsed → incomplete (collapse takes precedence)', () => {
  const reviews = allPassing([]).map((r) =>
    r.axis === 'sensory-safety' ? { ...r, mean: 1, degraded: true } : r,
  );
  const g = runGate(reviews);
  assert.equal(g.status, 'incomplete');
  assert.deepEqual(g.collapsedAxes, ['sensory-safety']);
});

test('pass carries an empty degradedAxes list', () => {
  const g = runGate(allPassing([]));
  assert.equal(g.status, 'pass');
  assert.deepEqual(g.degradedAxes, []);
});