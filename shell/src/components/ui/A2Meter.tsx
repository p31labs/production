import { CSSProperties } from 'react';

export interface A2MeterProps {
  icon?: string;
  value: number;
  min?: number;
  max?: number;
  color?: string;
  label?: string;
  style?: CSSProperties;
}

export default function A2Meter({ icon, value, min = 0, max = 100, color = 'var(--p31-accent)', label, style }: A2MeterProps) {
  const pct = max === min ? 0 : Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-tiny)', ...style }}>
      {icon ? <span style={{ fontSize: 24, lineHeight: 1 }}>{icon}</span> : null}
      <div style={{ flex: 1, background: 'var(--p31-glass-bg)', borderRadius: 99, overflow: 'hidden', height: 12 }}>
        <div
          role="meter"
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.3s' }}
        />
      </div>
      {label ? <span style={{ fontSize: 11, color: 'var(--p31-text-secondary)', minWidth: 32, textAlign: 'right' }}>{label}</span> : null}
    </div>
  );
}
