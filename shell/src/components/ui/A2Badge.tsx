import { CSSProperties } from 'react';

export interface A2BadgeProps {
  text: string;
  variant?: 'success' | 'error' | 'warning' | 'default';
  style?: CSSProperties;
}

const BADGE_STYLES: Record<NonNullable<A2BadgeProps['variant']>, { bg: string; color: string }> = {
  success: { bg: 'color-mix(in oklch, var(--p31-accent-green) 15%, transparent)', color: 'var(--p31-accent-green)' },
  error: { bg: 'color-mix(in oklch, var(--p31-accent-red) 15%, transparent)', color: 'var(--p31-accent-red)' },
  warning: { bg: 'color-mix(in oklch, var(--p31-accent-gold) 15%, transparent)', color: 'var(--p31-accent-gold)' },
  default: { bg: 'var(--p31-glass-bg)', color: 'var(--p31-text)' },
};

export default function A2Badge({ text, variant = 'default', style }: A2BadgeProps) {
  const s = BADGE_STYLES[variant] ?? BADGE_STYLES.default;
  return (
    <span className="metric-badge" style={{ ...style, background: s.bg, color: s.color }}>
      {text}
    </span>
  );
}
