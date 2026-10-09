/**
 * @p31ca/controls — Fader.tsx
 *
 * A vertical slider following the WAI-ARIA slider pattern. The Knob's linear
 * sibling: same keyboard contract, same gesture lifecycle, same
 * committed/ephemeral split. Drag is 1:1 with the track — a fader's
 * affordance is that the handle position IS the value, so a scaled drag
 * would break the metaphor. (The track is the full pointer-travel range.)
 */

import * as React from 'react';
import { dragDeltaToValue, applyKey, SLIDER_KEYS } from './knobMath';
import type { ControlBaseProps } from './types';

export interface FaderProps extends ControlBaseProps {
  value: number;
  onChange: (value: number) => void;
  /** Committed value — fired on gesture end. */
  onCommit?: (value: number) => void;
  min?: number;
  max?: number;
  /** Keyboard step, in VALUE units. */
  step?: number;
  /** Track height in px. Defaults to the --p31-control-fader-height token. */
  height?: number;
  /** Double-click resets to this. */
  defaultValue?: number;
}

function normalize(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

export function Fader({
  value,
  onChange,
  onCommit,
  label,
  min = 0,
  max = 1,
  step,
  height,
  defaultValue,
  disabled = false,
  learnState = 'idle',
  onGestureStart,
  onGestureEnd,
  id,
  formatValue,
  className,
  style,
}: FaderProps) {
  const dragState = React.useRef<{ pointerId: number; startY: number; startValue: number; moved: boolean } | null>(null);
  const initialValue = React.useRef(value).current;
  const resetTarget = defaultValue ?? initialValue;

  const span = max - min;
  const position = normalize(value, min, max);

  const fmt = React.useCallback(
    (v: number) => (formatValue ? formatValue(v) : v.toFixed(2)),
    [formatValue],
  );

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      onGestureStart?.();
      dragState.current = {
        pointerId: e.pointerId,
        startY: e.clientY,
        startValue: position,
        moved: false,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    [disabled, onGestureStart, position],
  );

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragState.current;
      if (!d || d.pointerId !== e.pointerId || disabled) return;
      const dy = e.clientY - d.startY;
      if (dy === 0) return;
      d.moved = true;
      // Faders use the same vertical-drag math as knobs without the fine
      // modifier — the track is the metaphor, so a full-drag span is the
      // full value range.
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
        /* already released */
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
      const nextPct = applyKey(e.key, position, stepPct, e.shiftKey);
      const next = min + nextPct * span;
      if (next !== value) {
        onChange(next);
        onCommit?.(next);
      }
    },
    [disabled, value, position, min, span, step, onChange, onCommit],
  );

  const handleDoubleClick = React.useCallback(() => {
    if (disabled) return;
    onChange(resetTarget);
    onCommit?.(resetTarget);
  }, [disabled, resetTarget, onChange, onCommit]);

  return (
    <div
      className={['p31-fader', `p31-fader--${learnState}`, className].filter(Boolean).join(' ')}
      style={style}
      data-control="fader"
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
        className="p31-fader__track"
        style={height ? { height } : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => endGesture(e, true)}
        onPointerCancel={(e) => endGesture(e, false)}
        onKeyDown={handleKeyDown}
        onDoubleClick={handleDoubleClick}
      >
        <div className="p31-fader__fill" style={{ height: `${position * 100}%` }} />
        <div className="p31-fader__handle" style={{ bottom: `${position * 100}%` }} />
      </div>
      <div className="p31-fader__label">{label}</div>
      <div className="p31-fader__readout" aria-hidden="true">{fmt(value)}</div>
    </div>
  );
}