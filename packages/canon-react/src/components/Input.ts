import type { InputHTMLAttributes } from 'react';
import { inputTree } from '@p31ca/canon-parts/markup';
import { nodeToReact, pass, orderedRest } from '../reactTree.js';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> {
  label?: import('react').ReactNode;
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  width?: 'form' | 'full';
  id?: string;
  /** Applied to the wrapping field (the control itself stays class-free). */
  className?: string;
}

/**
 * Input — the canon v2 text input (React world). The raw element carries
 * `data-p31-control` FIRST so the raw-control gate sees it. Label / error /
 * hint are wired by the Field wrapper.
 * NOTE: default id is deterministic 'p31-input' (seed used React useId).
 */
export function Input({ label, hideLabel, hint, error, width, id, className = '', ...rest }: InputProps) {
  const tree = inputTree({
    label: label != null ? pass(label) : null,
    hideLabel: Boolean(hideLabel),
    hint,
    error,
    width,
    id,
    className,
    rest: orderedRest(rest as Record<string, unknown>, [
      'type', 'name', 'placeholder', 'value', 'defaultValue', 'autoComplete',
      'required', 'disabled', 'readOnly', 'min', 'max', 'step', 'pattern',
      'checked', 'defaultChecked',
    ]),
  });
  return nodeToReact(tree);
}

export default Input;