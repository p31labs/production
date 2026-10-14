import type { CSSProperties } from 'react';

export interface SkeletonBarProps {
  shape?: 'bar' | 'block';
  className?: string;
  style?: CSSProperties;
}

export interface SkeletonProps {
  /** Number of shimmer bars (default 3). */
  lines?: number;
  /** Render the last bar as a block shape. */
  block?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** SkeletonBar — one shimmer bar; motion off under prefers-reduced-motion. */
export function SkeletonBar({ shape = 'bar', className = '', style }: SkeletonBarProps) {
  return <div data-p31="skeleton-bar" data-shape={shape} aria-hidden="true" className={className} style={style} />;
}

/** Skeleton — a loading placeholder stack. */
export function Skeleton({ lines = 3, block = false, className = '', style }: SkeletonProps) {
  return (
    <div data-p31="skeleton" aria-hidden="true" className={className} style={style}>
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonBar key={i} shape={block && i === lines - 1 ? 'block' : 'bar'} />
      ))}
    </div>
  );
}

export default Skeleton;