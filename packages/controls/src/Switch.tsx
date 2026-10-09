/**
 * @p31ca/controls — Switch.tsx
 *
 * A two-state rocker following the WAI-ARIA switch pattern. Space/Enter
 * toggles. role="switch" with aria-checked is the correct role for a binary
 * control that changes state immediately (a checkbox is for form
 * submission; a switch is for an instant state change).
 */

import * as React from 'react';
import type { ControlBaseProps } from './types';

export interface SwitchProps extends Omit<ControlBaseProps, 'formatValue'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  onCommit?: (checked: boolean) => void;
  /** Optional on/off labels for the readout. */
  onLabel?: string;
  offLabel?: string;
}

export function Switch({
  checked,
  onChange,
  onCommit,
  label,
  onLabel = 'On',
  offLabel = 'Off',
  disabled = false,
  learnState = 'idle',
  onGestureStart,
  onGestureEnd,
  id,
  className,
  style,
}: SwitchProps) {
  const toggle = React.useCallback(() => {
    if (disabled) return;
    onGestureStart?.();
    const next = !checked;
    onChange(next);
    onCommit?.(next);
    onGestureEnd?.();
  }, [checked, disabled, onChange, onCommit, onGestureStart, onGestureEnd]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggle();
      }
    },
    [disabled, toggle],
  );

  return (
    <div
      className={['p31-switch', `p31-switch--${learnState}`, className].filter(Boolean).join(' ')}
      style={style}
      data-control="switch"
      data-learn={learnState}
    >
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        className="p31-switch__rocker"
        onClick={toggle}
        onKeyDown={handleKeyDown}
      >
        <span className="p31-switch__knob" aria-hidden="true" />
      </button>
      <div className="p31-switch__label">{label}</div>
      <div className="p31-switch__readout" aria-hidden="true">
        {checked ? onLabel : offLabel}
      </div>
    </div>
  );
}