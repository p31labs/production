import type { CSSProperties, ReactNode } from 'react';
import { stackTree} from '@p31ca/canon-parts/markup';
import { nodeToReact, pass } from '../reactTree.js';

export type StackDir = 'row' | 'column';
export type StackGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type StackAlign = 'start' | 'center' | 'end' | 'stretch';
export type StackJustify = 'start' | 'center' | 'end' | 'between';

export interface StackProps {
  dir?: StackDir;
  gap?: StackGap;
  align?: StackAlign;
  justify?: StackJustify;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** Stack — one-axis flex with data-driven dir/gap/align/justify. */
export function Stack({ dir = 'column', gap = 'md', align, justify, children, className = '', style }: StackProps) {
  const tree = stackTree({
    dir,
    gap,
    align,
    justify,
    children: pass(children),
    className,
    style,
  });
  return nodeToReact(tree);
}

export default Stack;