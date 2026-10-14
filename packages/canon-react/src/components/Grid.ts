import type { CSSProperties, ReactNode } from 'react';
import { gridTree} from '@p31ca/canon-parts/markup';
import { nodeToReact, pass } from '../reactTree.js';

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
  const tree = gridTree({ min, children: pass(children), className, style });
  return nodeToReact(tree);
}

export default Grid;