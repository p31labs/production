import type { CSSProperties, ReactNode } from 'react';

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
  return (
    <div
      data-p31="stack"
      data-dir={dir}
      data-gap={gap}
      data-align={align}
      data-justify={justify}
      className={className}
      style={style}
    >
      {children}
    </div>
  );
}

export default Stack;