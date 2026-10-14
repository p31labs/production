import { useId } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { Field, type FieldProps } from './Field';

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'className'> {
  label?: FieldProps['label'];
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  width?: FieldProps['width'];
  id?: string;
  className?: string;
}

/** Textarea — the canon v2 multiline control (resize vertical only). */
export function Textarea({ label, hideLabel, hint, error, width, id, className = '', rows = 3, ...rest }: TextareaProps) {
  const autoId = useId();
  const controlId = id ?? `p31-textarea-${autoId}`;
  const describedBy = error ? `${controlId}-error` : hint ? `${controlId}-hint` : undefined;
  return (
    <Field id={controlId} label={label} hideLabel={hideLabel} hint={hint} error={error} width={width} className={className}>
      <textarea
        data-p31-control="textarea"
        id={controlId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
    </Field>
  );
}

export default Textarea;