/**
 * The music maker — elemental frequencies.
 *
 * Pins that the timbres are REAL NMR gyromagnetic ratios to ³¹P at the same
 * field (γ/2π in MHz/T: ¹H 42.577, ³¹P 17.235, ¹³C 10.705, ¹⁷O 5.772,
 * ⁴³Ca 2.865, ²³Na 11.262), not invented constants.
 */
import { describe, expect, it } from 'vitest';
import { FREQ, LARMOR_HZ, vertexFrequencyHz, LARMOR_DIVISORS } from './frequencies';

describe('LARMOR_HZ', () => {
  it('is 863 — the rounded ³¹P Earth-field Larmor frequency', () => {
    // γ/2π = 17.235 MHz/T × ~50 µT ≈ 862 Hz; the brand rounds to 863.
    expect(LARMOR_HZ).toBe(863);
  });
});

describe('elemental frequencies', () => {
  it('phosphor is the Larmor frequency itself', () => {
    expect(FREQ.phosphor).toBe(863);
  });

  it('uses the real gyromagnetic ratios, not invented ones', () => {
    expect(FREQ.hydrogen).toBe(Math.round(863 * (42.577 / 17.235))); // 2132 Hz
    expect(FREQ.carbon).toBe(Math.round(863 * (10.705 / 17.235))); // 536 Hz
    expect(FREQ.oxygen).toBe(Math.round(863 * (5.772 / 17.235))); // 289 Hz
    expect(FREQ.calcium).toBe(Math.round(863 * (2.865 / 17.235))); // 143 Hz
    expect(FREQ.sodium).toBe(Math.round(863 * (11.262 / 17.235))); // 564 Hz
  });
});

describe('vertexFrequencyHz (the drone divisors)', () => {
  it('divides the Larmor frequency by the canonical divisors', () => {
    expect(LARMOR_DIVISORS).toEqual([8, 6, 5, 4]);
    expect(vertexFrequencyHz(0)).toBeCloseTo(863 / 8);
    expect(vertexFrequencyHz(1)).toBeCloseTo(863 / 6);
    expect(vertexFrequencyHz(2)).toBeCloseTo(863 / 5);
    expect(vertexFrequencyHz(3)).toBeCloseTo(863 / 4);
  });
});