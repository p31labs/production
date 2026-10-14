import type { SelectHTMLAttributes } from 'react';
import { selectTree } from '@p31ca/canon-parts/markup';
import { nodeToReact, pass, orderedRest } from '../reactTree.js';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'className' | 'children'> {
  label?: import('react').ReactNode;
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  width?: 'form' | 'full';
  options: readonly SelectOption[];
  id?: string;
  className?: string;
}

/** Select — the canon v2 native select, styled by the control contract. */
export function Select({ label, hideLabel, hint, error, width, options, id, className = '', ...rest }: SelectProps) {
  const tree = selectTree({
    label: label != null ? pass(label) : null,
    hideLabel: Boolean(hideLabel),
    hint,
    error,
    width,
    id,
    className,
    options: [...options],
    rest: orderedRest(rest as Record<string, unknown>, [
      'name', 'required', 'disabled',
    ]),
  });
  return nodeToReact(tree);
}

export default Select;