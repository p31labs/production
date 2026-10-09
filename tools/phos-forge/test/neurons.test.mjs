/**
 * neurons.test.mjs — negative controls for the neuron-budget accounting.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateNeurons, utcDayKey, NeuronBudget, FREE_NEURONS_PER_DAY } from '../research/neurons.mjs';

test('estimateNeurons scales with tokens and model rate', () => {
  // 1M in + 0 out on a model rated 5500 neurons/M in → 5500 neurons.
  const a = estimateNeurons(1_000_000, 0, '@cf/zai-org/glm-4.7-flash');
  assert.equal(a, 5500);
  // A larger model costs more for the same tokens (45455/M in).
  const b = estimateNeurons(1_000_000, 0, '@cf/nvidia/nemotron-3-120b-a12b');
  assert.equal(b, 45455);
  // A realistic request: 2K in + 500 out on the cheap model ≈ 29 neurons.
  const c = estimateNeurons(2000, 500, '@cf/zai-org/glm-4.7-flash');
  assert.ok(c > 10 && c < 40, `a realistic call should be ~29 neurons, got ${c}`);
});

test('budget spends and reports remaining', () => {
  const b = new NeuronBudget(100);
  const r = b.spend(30);
  assert.equal(r.used, 30);
  assert.equal(r.remaining, 70);
  assert.equal(r.ok, true);
});

test('budget rejects overspend and rolls over at UTC midnight', () => {
  const b = new NeuronBudget(100, Date.UTC(2026, 9, 4, 12, 0, 0));
  assert.equal(b.wouldExceed(150), true, '150 > 100 remaining');
  b.spend(90);
  assert.equal(b.wouldExceed(20), true, '90+20 > 100');
  assert.equal(b.wouldExceed(10), false);

  // Next UTC day → budget resets, so 50 (under the 100 limit) no longer exceeds.
  const nextDay = Date.UTC(2026, 9, 5, 0, 0, 1);
  assert.equal(b.wouldExceed(50, nextDay), false, 'rollover resets the budget');
  assert.equal(b.used, 0, 'used resets to 0 after rollover');
});

test('utcDayKey is UTC, not local', () => {
  // 2026-10-04 23:59 UTC = "2026-10-04".
  assert.equal(utcDayKey(Date.UTC(2026, 9, 4, 23, 59, 59)), '2026-10-04');
  assert.equal(utcDayKey(Date.UTC(2026, 9, 5, 0, 0, 0)), '2026-10-05');
});

test('default rate covers unknown models without error', () => {
  const v = estimateNeurons(1_000_000, 0, 'unknown/model');
  assert.equal(v, 5000, 'unknown model falls back to the default rate');
});

test('free tier cap is 10,000 neurons', () => {
  assert.equal(FREE_NEURONS_PER_DAY, 10000);
});