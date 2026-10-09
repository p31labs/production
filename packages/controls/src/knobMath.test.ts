import { describe, it, expect } from 'vitest';
import {
  valueToAngle,
  angleToValue,
  dragDeltaToValue,
  valueArc,
  applyKey,
  stepFor,
  SLIDER_KEYS,
  MIN_ANGLE,
  MAX_ANGLE,
  SWEEP_DEG,
  DRAG_PX_FULL_RANGE,
  FINE_FACTOR,
  PAGE_FACTOR,
} from './knobMath';

/* The original p31ca suite, preserved verbatim — it pins the API contract. */

describe('knobMath — value ↔ angle', () => {
  it('maps 0 → MIN_ANGLE and 1 → MAX_ANGLE', () => {
    expect(valueToAngle(0)).toBe(MIN_ANGLE);
    expect(valueToAngle(1)).toBe(MAX_ANGLE);
  });

  it('maps 0.5 → 0 (center)', () => {
    expect(valueToAngle(0.5)).toBeCloseTo(0, 6);
  });

  it('sweep is 270° with a bottom dead zone', () => {
    expect(SWEEP_DEG).toBe(270);
  });

  it('inverts via angleToValue', () => {
    for (const v of [0, 0.25, 0.5, 0.75, 1]) {
      expect(angleToValue(valueToAngle(v))).toBeCloseTo(v, 6);
    }
  });
});

describe('knobMath — drag', () => {
  it('drag up increases the value', () => {
    const v = dragDeltaToValue(0.5, -50);
    expect(v).toBeGreaterThan(0.5);
  });

  it('drag down decreases the value', () => {
    const v = dragDeltaToValue(0.5, 50);
    expect(v).toBeLessThan(0.5);
  });

  it('full range over 200px', () => {
    expect(dragDeltaToValue(0.5, -100)).toBeCloseTo(1, 6);
    expect(dragDeltaToValue(0.5, 100)).toBeCloseTo(0, 6);
  });

  it('clamps to [0, 1]', () => {
    expect(dragDeltaToValue(0.5, -9999)).toBe(1);
    expect(dragDeltaToValue(0.5, 9999)).toBe(0);
  });
});

describe('knobMath — valueArc', () => {
  it('clamps the arc fraction', () => {
    expect(valueArc(-1)).toBe(0);
    expect(valueArc(2)).toBe(1);
    expect(valueArc(0.4)).toBe(0.4);
  });
});

/* The new keyboard + fine-adjust contract. */

describe('knobMath — keyboard (WAI-ARIA slider)', () => {
  it('arrows step by 1/100 by default', () => {
    expect(applyKey('ArrowUp', 0.5)).toBeCloseTo(0.51, 6);
    expect(applyKey('ArrowDown', 0.5)).toBeCloseTo(0.49, 6);
  });

  it('shift scales the step by the fine factor', () => {
    expect(applyKey('ArrowUp', 0.5, 0.1, true)).toBeCloseTo(0.51, 6);
    expect(applyKey('ArrowUp', 0.5, 0.1)).toBeCloseTo(0.6, 6);
  });

  it('PageUp/PageDown jump by 10× the step', () => {
    expect(applyKey('PageUp', 0.5, 0.01)).toBeCloseTo(0.6, 6);
    expect(applyKey('PageDown', 0.5, 0.01)).toBeCloseTo(0.4, 6);
  });

  it('Home/End snap to the bounds', () => {
    expect(applyKey('Home', 0.5)).toBe(0);
    expect(applyKey('End', 0.5)).toBe(1);
  });

  it('clamps at the bounds', () => {
    expect(applyKey('ArrowUp', 0.99)).toBe(1);
    expect(applyKey('ArrowDown', 0.01)).toBe(0);
  });

  it('an unknown key is a no-op', () => {
    expect(applyKey('a', 0.5)).toBe(0.5);
  });

  it('SLIDER_KEYS is exactly the ARIA contract', () => {
    expect([...SLIDER_KEYS]).toEqual([
      'ArrowUp',
      'ArrowRight',
      'ArrowDown',
      'ArrowLeft',
      'PageUp',
      'PageDown',
      'Home',
      'End',
    ]);
  });
});

describe('knobMath — step + fine constants', () => {
  it('stepFor defaults to 1/100', () => {
    expect(stepFor()).toBeCloseTo(0.01, 6);
    expect(stepFor(0.25)).toBe(0.25);
  });

  it('the constants are the researched values', () => {
    expect(FINE_FACTOR).toBe(0.1);
    expect(PAGE_FACTOR).toBe(10);
    expect(DRAG_PX_FULL_RANGE).toBe(200);
  });
});