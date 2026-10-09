import { describe, it, expect } from 'vitest'
import { valueToAngle, angleToValue, dragDeltaToValue, valueArc, MIN_ANGLE, MAX_ANGLE, SWEEP_DEG } from '../../knobMath'

describe('knobMath — value ↔ angle', () => {
  it('maps 0 → MIN_ANGLE and 1 → MAX_ANGLE', () => {
    expect(valueToAngle(0)).toBe(MIN_ANGLE)
    expect(valueToAngle(1)).toBe(MAX_ANGLE)
  })

  it('maps 0.5 → 0 (center)', () => {
    expect(valueToAngle(0.5)).toBeCloseTo(0, 6)
  })

  it('sweep is 270° with a bottom dead zone', () => {
    expect(SWEEP_DEG).toBe(270)
  })

  it('inverts via angleToValue', () => {
    for (const v of [0, 0.25, 0.5, 0.75, 1]) {
      expect(angleToValue(valueToAngle(v))).toBeCloseTo(v, 6)
    }
  })
})

describe('knobMath — drag', () => {
  it('drag up increases the value', () => {
    const v = dragDeltaToValue(0.5, -50)
    expect(v).toBeGreaterThan(0.5)
  })

  it('drag down decreases the value', () => {
    const v = dragDeltaToValue(0.5, 50)
    expect(v).toBeLessThan(0.5)
  })

  it('full range over 200px', () => {
    expect(dragDeltaToValue(0.5, -100)).toBeCloseTo(1, 6)
    expect(dragDeltaToValue(0.5, 100)).toBeCloseTo(0, 6)
  })

  it('clamps to [0, 1]', () => {
    expect(dragDeltaToValue(0.5, -9999)).toBe(1)
    expect(dragDeltaToValue(0.5, 9999)).toBe(0)
  })
})

describe('knobMath — valueArc', () => {
  it('clamps the arc fraction', () => {
    expect(valueArc(-1)).toBe(0)
    expect(valueArc(2)).toBe(1)
    expect(valueArc(0.4)).toBe(0.4)
  })
})