import type { TextareaHTMLAttributes } from 'react';
import { textareaTree } from '@p31ca/canon-parts/markup';
import { nodeToReact, pass, orderedRest } from '../reactTree.js';

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'className'> {
  label?: import('react').ReactNode;
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  width?: 'form' | 'full';
  id?: string;
  className?: string;
}

/** Textarea — the canon v2 multiline control (resize vertical only). */
export function Textarea({ label, hideLabel, hint, error, width, id, className = '', rows = 3, ...rest }: TextareaProps) {
  const tree = textareaTree({
    label: label != null ? pass(label) : null,
    hideLabel: Boolean(hideLabel),
    hint,
    error,
    width,
    id,
    className,
    rows,
    rest: orderedRest(rest as Record<string, unknown>, [
      'name', 'placeholder', 'autoComplete', 'required', 'disabled', 'readOnly',
    ]),
  });
  return nodeToReact(tree);
}

export default Textarea;