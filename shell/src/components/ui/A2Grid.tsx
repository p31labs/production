import { CSSProperties, ReactNode } from 'react';
import A2Card, { type A2CardProps } from './A2Card';

export interface A2GridProps {
  columns?: number;
  items?: A2CardProps[];
  style?: CSSProperties;
}

export default function A2Grid({ columns = 2, items = [], style }: A2GridProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 'var(--p31-space-tiny)', ...style }}>
      {items.map((item, i) => <A2Card key={i} {...item} />)}
    </div>
  );
}
