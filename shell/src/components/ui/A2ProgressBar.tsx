import { CSSProperties } from 'react';

export interface A2ProgressBarProps {
  value: number;
  min?: number;
  max?: number;
  label?: string;
  style?: CSSProperties;
}

export default function A2ProgressBar({ value, min = 0, max = 100, label, style }: A2ProgressBarProps) {
  const pct = max === min ? 0 : Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-tiny)', ...style }}>
      <div style={{ flex: 1, background: 'var(--p31-glass-bg)', borderRadius: 99, overflow: 'hidden', height: 8 }}>
        <div
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          style={{ width: `${pct}%`, height: '100%', background: 'var(--p31-accent)', borderRadius: 99, transition: 'width 0.3s' }}
        />
      </div>
      {label ? <span style={{ fontSize: 10, color: 'var(--p31-text-secondary)' }}>{label}</span> : null}
    </div>
  );
}
