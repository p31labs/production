/**
 * @p31/controls — Knob.tsx
 *
 * Rotary control, extracted from apps/p31ca (SVG arc visual) and hardened:
 *
 *   • BUGFIX: the original called valueToAngle(rawValue) but the math is
 *     normalized 0..1 — a 0..100 knob pointed at max forever. This Knob
 *     normalizes before rotating.
 *   • Gesture lifecycle (onGestureStart/onGestureEnd) — the MIDI-learn arm
 *     seam. The Knob reports the gesture; it never knows what a learn is.
 *   • WAI-ARIA slider keyboard contract (arrows/PageUp/PageDown/Home/End).
 *   • role="slider" with the full ARIA value set. A <div role="slider"> is
 *     the correct element — a range input cannot express the 270° rotation
 *     or the gesture lifecycle, and the ARIA contract is what assistive
 *     tech consumes.
 *   • Committed/ephemeral split: onChange fires per drag frame (ephemeral);
 *     onCommit fires on gesture end (the log-worthy final value).
 */

import * as React from 'react';
import { MIN_ANGLE, SWEEP_DEG, valueToAngle, dragDeltaToValue, applyKey, SLIDER_KEYS } from './knobMath';
import type { ControlBaseProps } from './types';

export interface KnobProps extends ControlBaseProps {
  value: number;
  onChange: (value: number) => void;
  /** Committed value — fired on gesture end, not on every drag frame. */
  onCommit?: (value: number) => void;
  min?: number;
  max?: number;
  /** Keyboard step, in VALUE units (not normalized). */
  step?: number;
  /** Diameter in px. Defaults to the --p31-control-knob-size token. */
  size?: number;
  /** Double-click resets to this. Defaults to the initial `value` prop. */
  defaultValue?: number;
  /** Suffix shown in the readout (e.g. 'x' → '3x'). */
  unit?: string;
  accent?: string;
}

/** Normalize a value into 0..1 within min..max. NaN-safe. */
function normalize(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

export function Knob({
  value,
  onChange,
  onCommit,
  label,
  min = 0,
  max = 100,
  step,
  size = 44,
  defaultValue,
  unit = '',
  accent = 'var(--p31-accent)',
  disabled = false,
  learnState = 'idle',
  onGestureStart,
  onGestureEnd,
  id,
  formatValue,
  className,
  style,
}: KnobProps) {
  const dragState = React.useRef<{ pointerId: number; startY: number; startValue: number; moved: boolean } | null>(null);
  const initialValue = React.useRef(value).current;
  const resetTarget = defaultValue ?? initialValue;

  const span = max - min;
  const pct = normalize(value, min, max);
  const angle = valueToAngle(pct); // BUGFIX: normalized, not raw
  const arc = pct * SWEEP_DEG;
  const c = size / 2;
  const r = c - 7;

  const fmt = React.useCallback(
    (v: number) => (formatValue ? formatValue(v) : `${Math.round(v)}${unit}`),
    [formatValue, unit],
  );

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      onGestureStart?.();
      dragState.current = {
        pointerId: e.pointerId,
        startY: e.clientY,
        startValue: pct,
        moved: false,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    [disabled, onGestureStart, pct],
  );

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragState.current;
      if (!d || d.pointerId !== e.pointerId || disabled) return;
      const dy = e.clientY - d.startY;
      if (dy === 0) return;
      d.moved = true;
      const next = dragDeltaToValue(d.startValue, dy, e.shiftKey);
      onChange(min + next * span);
    },
    [disabled, min, span, onChange],
  );

  const endGesture = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
      const d = dragState.current;
      if (!d) return;
      dragState.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* capture already released */
      }
      if (commit && d.moved) onCommit?.(value);
      onGestureEnd?.();
    },
    [onCommit, onGestureEnd, value],
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled || !SLIDER_KEYS.has(e.key)) return;
      e.preventDefault();
      const stepValue = step ?? span / 100;
      const stepPct = stepValue / span;
      const nextPct = applyKey(e.key, pct, stepPct, e.shiftKey);
      const next = min + nextPct * span;
      if (next !== value) {
        onChange(next);
        onCommit?.(next);
      }
    },
    [disabled, value, pct, min, span, step, onChange, onCommit],
  );

  const handleWheel = React.useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.preventDefault();
      const stepValue = step ?? span / 100;
      const dir = e.deltaY > 0 ? -1 : 1;
      const next = Math.max(min, Math.min(max, value + dir * stepValue * (e.shiftKey ? 0.1 : 1)));
      if (next !== value) {
        onChange(next);
        onCommit?.(next);
      }
    },
    [disabled, value, min, max, span, step, onChange, onCommit],
  );

  const handleDoubleClick = React.useCallback(() => {
    if (disabled) return;
    onChange(resetTarget);
    onCommit?.(resetTarget);
  }, [disabled, resetTarget, onChange, onCommit]);

  return (
    <div
      className={['p31-knob', `p31-knob--${learnState}`, className].filter(Boolean).join(' ')}
      style={style}
      data-control="knob"
      data-learn={learnState}
    >
      <div
        id={id}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={fmt(value)}
        aria-orientation="vertical"
        aria-disabled={disabled || undefined}
        className="p31-knob__dial"
        style={{ width: size, height: size }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => endGesture(e, true)}
        onPointerCancel={(e) => endGesture(e, false)}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
          <path d={arcPath(c, r, MIN_ANGLE)} fill="none" stroke="var(--p31-glass-border)" strokeWidth={2.5} strokeLinecap="round" />
          <path
            d={arcPath(c, r, MIN_ANGLE)}
            fill="none"
            stroke={accent}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={`${arc * 2.4} ${999}`}
            style={{ opacity: 0.9 }}
          />
          <circle cx={c} cy={c} r={c - 3} fill="url(#p31-knob-grad)" stroke="var(--p31-glass-border)" strokeWidth={1} />
          <line
            x1={c} y1={c}
            x2={c} y2={c - (r - 2)}
            stroke="var(--p31-text-primary)"
            strokeWidth={2.5}
            strokeLinecap="round"
            transform={`rotate(${angle} ${c} ${c})`}
          />
          <defs>
            <radialGradient id="p31-knob-grad" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="var(--p31-surface3)" />
              <stop offset="100%" stopColor="var(--p31-surface)" />
            </radialGradient>
          </defs>
        </svg>
      </div>
      <div className="p31-knob__label">{label}</div>
      <div className="p31-knob__readout" aria-hidden="true">{fmt(value)}</div>
    </div>
  );
}

function arcPath(c: number, r: number, startDeg: number): string {
  const start = (startDeg - 90) * (Math.PI / 180);
  const end = (startDeg + 270 - 90) * (Math.PI / 180);
  const x1 = c + r * Math.cos(start);
  const y1 = c + r * Math.sin(start);
  const x2 = c + r * Math.cos(end);
  const y2 = c + r * Math.sin(end);
  return `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`;
}
export default Knob;
