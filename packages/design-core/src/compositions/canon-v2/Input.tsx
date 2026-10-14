import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Field, type FieldProps } from './Field';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> {
  label?: FieldProps['label'];
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  width?: FieldProps['width'];
  id?: string;
  /** Applied to the wrapping field (the control itself stays class-free). */
  className?: string;
}

/**
 * Input — the canon v2 text input. The raw element carries
 * `data-p31-control` FIRST so the raw-control gate and the control contract
 * both see it. Label / error / hint are wired by the Field wrapper.
 */
export function Input({ label, hideLabel, hint, error, width, id, className = '', ...rest }: InputProps) {
  const autoId = useId();
  const controlId = id ?? `p31-input-${autoId}`;
  const describedBy = error ? `${controlId}-error` : hint ? `${controlId}-hint` : undefined;
  return (
    <Field id={controlId} label={label} hideLabel={hideLabel} hint={hint} error={error} width={width} className={className}>
      <input
        data-p31-control="input"
        id={controlId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
    </Field>
  );
}

export default Input;