import type { CSSProperties, ReactNode } from 'react';
import { fieldTree} from '@p31ca/canon-parts/markup';
import { nodeToReact, pass } from '../reactTree.js';

export interface FieldProps {
  label?: ReactNode;
  /** Render the label for screen readers only (data-p31="sr-only"). */
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  /** Cap the field at the form width (data-width="form"). */
  width?: 'form' | 'full';
  /** Control id — the label's htmlFor and the error/hint ids derive from it. */
  id?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Field — label / control / hint / error as one attribute-scoped grid.
 * NOTE (parity deviation, documented): the default control id is the
 * deterministic 'p31-field' (the seed's React useId suffix is render-order
 * dependent and cannot match the Astro world's static render).
 */
export function Field({ label, hideLabel, hint, error, width = 'full', id, children, className = '', style }: FieldProps) {
  const controlId = id ?? 'p31-field';
  const tree = fieldTree({
    label: label != null ? pass(label) : null,
    hideLabel: Boolean(hideLabel),
    hint,
    error,
    width,
    controlId,
    control: pass(children),
    className,
    style,
  });
  return nodeToReact(tree);
}

export default Field;