import { useId } from 'react';
import type { CSSProperties, ReactNode } from 'react';

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
 * The control (Input/Textarea/Select) owns the id and passes it down so the
 * label and the error/hint description stay wired without ids leaking.
 */
export function Field({ label, hideLabel, hint, error, width = 'full', id, children, className = '', style }: FieldProps) {
  const autoId = useId();
  const controlId = id ?? `p31-field-${autoId}`;
  return (
    <div data-p31="field" data-width={width === 'form' ? 'form' : undefined} className={className} style={style}>
      {label && (
        <label data-p31={hideLabel ? 'sr-only' : 'field-label'} htmlFor={controlId}>{label}</label>
      )}
      {children}
      {error ? (
        <p data-p31="field-error" id={`${controlId}-error`} role="alert">{error}</p>
      ) : hint ? (
        <p data-p31="field-hint" id={`${controlId}-hint`}>{hint}</p>
      ) : null}
    </div>
  );
}

export default Field;