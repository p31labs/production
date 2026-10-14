import type { CSSProperties } from 'react';
import { skeletonTree, skeletonBarTree } from '@p31ca/canon-parts/markup';
import { nodeToReact } from '../reactTree.js';

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
  const tree = skeletonBarTree({ shape, className, style });
  return nodeToReact(tree);
}

/** Skeleton — a loading placeholder stack. */
export function Skeleton({ lines = 3, block = false, className = '', style }: SkeletonProps) {
  const tree = skeletonTree({ lines, block, className, style });
  return nodeToReact(tree);
}

export default Skeleton;