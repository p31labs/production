import { type CSSProperties, type ReactNode, type HTMLAttributes } from 'react';

export interface GlassCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'children' | 'title'> {
  title?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  variant?: 'default' | 'cyan' | 'violet' | 'gold' | 'green' | 'iris';
}

const variantColorMap: Record<string, { border: string; glow: string }> = {
  default: { border: 'var(--p31-glass-border)', glow: 'transparent' },
  cyan: { border: 'var(--p31-accent-cyan)', glow: 'var(--p31-accent-cyan)' },
  violet: { border: 'var(--p31-accent-violet)', glow: 'var(--p31-accent-violet)' },
  gold: { border: 'var(--p31-accent-gold)', glow: 'var(--p31-accent-gold)' },
  green: { border: 'var(--p31-accent-green)', glow: 'var(--p31-accent-green)' },
  iris: { border: 'var(--p31-accent-iris)', glow: 'var(--p31-accent-iris)' },
};

export default function GlassCard({
  title,
  children,
  actions,
  className = '',
  variant = 'default',
  ...rest
}: GlassCardProps) {
  const colors = variantColorMap[variant] ?? variantColorMap.default;
  const style: CSSProperties = {
    '--card-border': colors.border,
    '--card-glow': colors.glow,
  } as CSSProperties;

  const cls = ['glass-card'];
  if (className) cls.push(className);

  return (
    <div
      {...rest}
      style={style}
      className={cls.join(' ')}
    >
      {title != null && (
        <div className="glass-card-header">
          <span className="glass-card-title">{title}</span>
          {actions != null && <span className="glass-card-actions">{actions}</span>}
        </div>
      )}
      <div className="glass-card-body">{children}</div>
    </div>
  );
}
