/**
 * research.test.mjs — negative controls for the depth layers (A1/A3/A4).
 *
 * A gate that cannot fail is furniture. Each test asserts BOTH the pass and
 * the fail direction.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ResearchLedger } from '../research/ledger.mjs';
import {
  effectiveSampleSize,
  collapseSameRoot,
  citationRoot,
  checkMetricConsistency,
  verdict,
} from '../research/factcheck.mjs';
import { draftScope, intakeCheckpointComplete } from '../research/intake.mjs';

// ── A3: Research Ledger ────────────────────────────────────────────────────

test('ledger: contradiction cannot be resolved without evidence', () => {
  const l = new ResearchLedger();
  const x = l.addContradiction('claim a', 'claim b');
  const bad = l.resolveContradiction(x, null);
  assert.equal(bad.ok, false, 'assertion-only resolution must fail');

  const good = l.resolveContradiction(x, 'https://primary.example/evidence');
  assert.equal(good.ok, true, 'evidence-backed resolution must pass');
  assert.equal(l.validate().ok, true);
});

test('ledger: empty ledger is NOT saturated', () => {
  const l = new ResearchLedger();
  assert.equal(l.isSaturated(), false, 'nothing researched → not done');
});

test('ledger: saturation requires exhausted frontier AND no new dimensions', () => {
  const l = new ResearchLedger();
  l.addClaim('something', { sources: ['https://x'], confidence: 0.8 });
  l.addGap('unanswered question', { priority: 'high' });
  assert.equal(l.isSaturated(), false, 'open gap → not done');

  l.information_gaps[0].exhaustion = 5;
  assert.equal(l.isSaturated(), false, 'exhausted but no quiet rounds → not done');

  // Three quiet rounds (no new dimensions) → saturated.
  for (let i = 0; i < 3; i++) l.step();
  assert.equal(l.isSaturated(), true, 'exhausted + 3 quiet rounds → done');
});

test('ledger: a new dimension resets the quiet-round counter', () => {
  const l = new ResearchLedger();
  l.addClaim('something', { sources: ['https://x'] });
  l.information_gaps.push({ id: 'g1', question: 'q', priority: 'high', depth: 0, exhaustion: 9 });
  for (let i = 0; i < 2; i++) l.step();
  l.noteDimension('a brand-new angle');
  for (let i = 0; i < 3; i++) l.step();
  assert.equal(l.isSaturated(), true, 'after a new dimension + 3 quiet rounds → done');
});

test('ledger: round-trips through JSON', () => {
  const l = new ResearchLedger('2026-10-04');
  l.addClaim('a fact', { sources: ['https://x'], confidence: 0.9, tier: 'primary' });
  l.setMetric('market_size', 4.2, { unit: 'USD', source: 'https://x' });
  const restored = ResearchLedger.fromJSON(JSON.parse(JSON.stringify(l)));
  assert.equal(restored.verified_claims.length, 1);
  assert.equal(restored.metric_ledger.market_size.value, 4.2);
  assert.equal(restored.as_of, '2026-10-04');
});

// ── A4: Fact-check gate ───────────────────────────────────────────────────

test('factcheck: same-root citations collapse to one warrant', () => {
  const citations = [
    'https://press.example/release/launch',
    'https://press.example/release/launch?utm=1',
    'https://press.example/release/launch#details',
    'https://independent.example/analysis',
  ];
  const collapsed = collapseSameRoot(citations);
  assert.equal(collapsed.length, 2, 'same press release ×3 collapses to one warrant + one independent');
});

test('factcheck: effective sample size penalizes echo', () => {
  // Nine agents, but they echo one source (φ≈0.85) → <3 effective votes.
  const nEff = effectiveSampleSize(9, 0.85);
  assert.ok(nEff < 3, `nine echoing voices should be <3 effective votes, got ${nEff}`);
  assert.ok(effectiveSampleSize(3, 0) === 3, 'independent sources count fully');
});

test('factcheck: no source → OUT_OF_KB', () => {
  const v = verdict('a claim', { ledger: new ResearchLedger(), sources: [] });
  assert.equal(v.verdict, 'OUT_OF_KB');
});

test('factcheck: single source → UNRESOLVED (no corroboration)', () => {
  const v = verdict('a claim', { ledger: new ResearchLedger(), sources: ['https://only.example/x'] });
  assert.equal(v.verdict, 'UNRESOLVED');
});

test('factcheck: two independent sources → VERIFIED', () => {
  const v = verdict('a claim', {
    ledger: new ResearchLedger(),
    sources: ['https://a.example/x', 'https://b.example/x'],
  });
  assert.equal(v.verdict, 'VERIFIED');
});

test('factcheck: a conflicting ledger claim → CONTRADICTED', () => {
  const l = new ResearchLedger();
  l.addClaim('the market is shrinking', { sources: ['https://x'], confidence: 0.9, contradicts: ['the market is growing'] });
  const v = verdict('the market is growing', { ledger: l, sources: ['https://a.example/x', 'https://b.example/x'] });
  assert.equal(v.verdict, 'CONTRADICTED', 'the four-verdict resolution must return CONTRADICTED');
});

test('factcheck: metric drift is caught', () => {
  const l = new ResearchLedger();
  l.setMetric('market_size', 4.2, { unit: 'USD', source: 'https://x' });
  const drifted = checkMetricConsistency('market_size is 9.9 billion', l);
  assert.equal(drifted.length, 1, 'drifted number must be flagged');
  assert.equal(drifted[0].ledger, 4.2);
  assert.equal(drifted[0].report, 9.9);
});

test('factcheck: citationRoot strips query + fragment', () => {
  assert.equal(
    citationRoot('https://press.example/release/launch?utm=1#top'),
    citationRoot('https://press.example/release/launch'),
  );
});

// ── A1: Guided intake ─────────────────────────────────────────────────────

test('intake: incomplete scope does not clear the checkpoint', () => {
  const d = draftScope('some dump');
  assert.equal(intakeCheckpointComplete(d), false, 'empty draft must not clear');

  d.objective = 'build a calm spoon tracker';
  assert.equal(intakeCheckpointComplete(d), false, 'missing scope/constraints/format must not clear');

  d.scope = ['calm-mode UI'];
  d.constraints = ['spoon-aware'];
  d.deliverable_format = 'markdown report';
  assert.equal(intakeCheckpointComplete(d), true, 'all required fields present → clear');
});