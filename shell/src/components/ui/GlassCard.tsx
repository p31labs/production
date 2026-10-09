import { type CSSProperties, type ReactNode, type HTMLAttributes } from 'react';

export type GlassCardVariant = 'default' | 'willow' | 'bash' | 'phos' | 'bonding';

export interface GlassCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'onClick' | 'children' | 'title'> {
  title?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
  interactive?: boolean;
  className?: string;
  variant?: GlassCardVariant;
  bodyLayout?: 'default' | 'centered';
}

const variantColorMap: Record<GlassCardVariant, { color: string; text: string }> = {
  default: { color: 'transparent', text: 'var(--p31-text-secondary)' },
  willow: { color: 'var(--p31-accent)', text: 'oklch(88% 0.06 45)' },
  bash: { color: 'var(--p31-accent-gold)', text: 'oklch(92% 0.06 88)' },
  phos: { color: 'var(--p31-accent-green)', text: 'oklch(90% 0.04 152)' },
  bonding: { color: 'var(--p31-accent-violet)', text: 'oklch(85% 0.05 28)' },
};

export default function GlassCard({
  title,
  children,
  actions,
  onClick,
  interactive = false,
  className = '',
  variant = 'default',
  bodyLayout = 'default',
  ...rest
}: GlassCardProps) {
  const clickable = interactive || !!onClick;
  const hasTint = variant !== 'default';
  const current = variantColorMap[variant] ?? variantColorMap.default;
  const cardStyle: CSSProperties = {
    ...((rest as Record<string, unknown>).style as CSSProperties || {}),
    '--card-tint-color': current.color,
    '--card-tint-text': current.text,
  } as CSSProperties;

  const cls = ['glass-card'];
  if (clickable) cls.push('interactive');
  if (className) cls.push(className);

  return (
    <div
      {...rest}
      style={cardStyle}
      className={cls.join(' ')}
      role={clickable ? 'button' : 'article'}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onClick : undefined}
      data-has-tint={hasTint || undefined}
      onKeyDown={(e) => {
        if (clickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {title != null && (
        <div className="glass-card-title">
          <span className="glass-card-title-text">{title}</span>
          {actions != null && <span className="glass-card-title-actions">{actions}</span>}
        </div>
      )}
      <div className={`glass-card-body${bodyLayout === 'centered' ? ' body-centered' : ''}`}>{children}</div>
    </div>
  );
}
