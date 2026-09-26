/**
 * @p31/controls — knobMath.ts
 *
 * Rotary control math (pure). Extracted from apps/p31ca/src/lib/knobMath.ts
 * WITHOUT changing the tested API — the normalized 0..1 contract is what the
 * existing p31ca Knob and its test suite pin:
 *
 *   valueToAngle(value)         — normalized 0..1 → degrees (-135..135)
 *   dragDeltaToValue(start, dy) — normalized start + px delta → normalized
 *   MIN_ANGLE / MAX_ANGLE       — the 270° sweep with a bottom dead zone
 *   SWEEP_DEG / DRAG_PX_FULL_RANGE / valueArc / angleToValue
 *
 * Added (non-breaking):
 *   • SLIDER_KEYS / applyKey — the WAI-ARIA slider keyboard contract
 *   • stepFor — explicit step else 1/100 of the span
 *   • FINE_FACTOR — Shift = 0.1× drag/keyboard step
 *
 * The enterprise convention (kol-controls / mui-audio-ui / Orbit): 270° sweep,
 * 200px vertical drag = full range, up = increase.
 */

/** The sweep's lower bound (deg). Upper is MIN_ANGLE + SWEEP_DEG. */
export const MIN_ANGLE = -135;
/** The sweep's upper bound (deg). */
export const MAX_ANGLE = 135;
/** Total sweep in degrees — the audio-knob convention. */
export const SWEEP_DEG = MAX_ANGLE - MIN_ANGLE; // 270
/** Pointer travel (px) to traverse the full range on a vertical drag. */
export const DRAG_PX_FULL_RANGE = 200;
/** Shift = 0.1× for fine adjustment. */
export const FINE_FACTOR = 0.1;
/** PageUp/PageDown = 10× the base step. */
export const PAGE_FACTOR = 10;

/** Normalized value (0..1) → knob angle (deg). */
export function valueToAngle(value: number): number {
  const v = Math.max(0, Math.min(1, value));
  return MIN_ANGLE + v * SWEEP_DEG;
}

/** Knob angle (deg) → normalized value (0..1). */
export function angleToValue(angle: number): number {
  const a = Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, angle));
  return (a - MIN_ANGLE) / SWEEP_DEG;
}

/** Vertical drag delta (px) → value change. Up (negative dy) increases. */
export function dragDeltaToValue(startValue: number, deltaY: number, fine = false): number {
  const perPx = 1 / DRAG_PX_FULL_RANGE;
  const next = startValue - (deltaY / DRAG_PX_FULL_RANGE) * (fine ? FINE_FACTOR : 1) * perPx * DRAG_PX_FULL_RANGE;
  // Simplify: with fine, the whole drag scales by FINE_FACTOR.
  const scaled = startValue - deltaY / DRAG_PX_FULL_RANGE * (fine ? FINE_FACTOR : 1);
  return Math.max(0, Math.min(1, scaled));
}

/** Arc length fraction for a value (the value-arc's filled fraction). */
export function valueArc(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** The keyboard keys a slider must handle (the ARIA contract, as data). */
export const SLIDER_KEYS = new Set([
  'ArrowUp',
  'ArrowRight',
  'ArrowDown',
  'ArrowLeft',
  'PageUp',
  'PageDown',
  'Home',
  'End',
]);

/** The step for a normalized range — explicit step else 1/100 of the span.
 *  `step` is expressed in normalized units (0..1). */
export function stepFor(step?: number): number {
  if (step !== undefined && step > 0) return step;
  return 1 / 100;
}

/** Apply a keyboard intent to a normalized value. Returns the new, clamped
 *  value. Implements the WAI-ARIA slider keyboard contract. */
export function applyKey(key: string, value: number, step?: number, shift = false): number {
  const base = stepFor(step) * (shift ? FINE_FACTOR : 1);
  const page = stepFor(step) * PAGE_FACTOR;
  switch (key) {
    case 'ArrowUp':
    case 'ArrowRight':
      return Math.max(0, Math.min(1, value + base));
    case 'ArrowDown':
    case 'ArrowLeft':
      return Math.max(0, Math.min(1, value - base));
    case 'PageUp':
      return Math.max(0, Math.min(1, value + page));
    case 'PageDown':
      return Math.max(0, Math.min(1, value - page));
    case 'Home':
      return 0;
    case 'End':
      return 1;
    default:
      return value;
  }
}