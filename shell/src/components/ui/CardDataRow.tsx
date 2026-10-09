import type { CSSProperties, ReactNode } from 'react';

interface CardDataRowProps {
  label: string;
  value: ReactNode;
  highlight?: string;
  highlightVariant?: 'phos' | 'willow' | 'bash' | 'default';
}

const highlightColorMap: Record<NonNullable<CardDataRowProps['highlightVariant']>, string> = {
  phos: 'var(--p31-accent-green)',
  willow: 'var(--p31-accent)',
  bash: 'var(--p31-accent-gold)',
  default: 'var(--p31-text-secondary)',
};

export function CardDataRow({ label, value, highlight, highlightVariant = 'phos' }: CardDataRowProps) {
  return (
    <div className="card-data-row">
      <span className="card-data-row-label">{label}</span>
      <div className="card-data-row-value-group">
        <span className="card-data-row-value">{value}</span>
        {highlight && (
          <span
            className="card-data-row-highlight"
            style={{ '--highlight-color': highlightColorMap[highlightVariant] } as CSSProperties}
          >
            {highlight}
          </span>
        )}
      </div>
    </div>
  );
}
