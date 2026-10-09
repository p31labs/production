/**
 * The music maker — morphogenetic field (vendored).
 *
 * ⚠️ HONEST LABEL: contested hypothesis made literal (not established physics).
 * Pins the pure mechanics: layer count, φⁿ scaling, finite values.
 */
import { describe, expect, it } from 'vitest';
import { computeMorphogeneticField, morphogeneticLayer, morphogeneticFieldValue } from './morphogeneticField';

describe('computeMorphogeneticField', () => {
  it('returns exactly `depth` layers', () => {
    expect(computeMorphogeneticField(0.5, 12).length).toBe(12);
    expect(computeMorphogeneticField(0.5, 6).length).toBe(6);
  });

  it('scales each layer by φⁿ', () => {
    const phi = (1 + Math.sqrt(5)) / 2;
    // With a zero rotation the layer is exactly φⁿ · seed.
    expect(morphogeneticLayer(0.5, 3, 0, 1)).toBeCloseTo(Math.pow(phi, 3) * 0.5);
  });

  it('produces finite aggregate values', () => {
    const v = morphogeneticFieldValue(0.618, 8, Math.PI / 4, 1.9);
    expect(Number.isFinite(v)).toBe(true);
  });
});