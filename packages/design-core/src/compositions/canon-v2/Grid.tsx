import type { CSSProperties, ReactNode } from 'react';

export type GridMin = 'sm' | 'md' | 'lg';

export interface GridProps {
  /** Card floor width — sm 15rem / md 17.5rem / lg 22.5rem. */
  min?: GridMin;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** Grid — auto-fill minmax card grid; data-min picks the floor token. */
export function Grid({ min = 'md', children, className = '', style }: GridProps) {
  return (
    <div data-p31="grid" data-min={min} className={className} style={style}>
      {children}
    </div>
  );
}

export default Grid;