import { useId } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { Field, type FieldProps } from './Field';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'className' | 'children'> {
  label?: FieldProps['label'];
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  width?: FieldProps['width'];
  options: readonly SelectOption[];
  id?: string;
  className?: string;
}

/**
 * Select — the canon v2 native select, styled by the control contract.
 * `data-p31-control` is the FIRST attribute so the raw-control gate passes.
 * Keyboard/mobile behavior stays native.
 */
export function Select({ label, hideLabel, hint, error, width, options, id, className = '', ...rest }: SelectProps) {
  const autoId = useId();
  const controlId = id ?? `p31-select-${autoId}`;
  const describedBy = error ? `${controlId}-error` : hint ? `${controlId}-hint` : undefined;
  return (
    <Field id={controlId} label={label} hideLabel={hideLabel} hint={hint} error={error} width={width} className={className}>
      <select
        data-p31-control="select"
        id={controlId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Field>
  );
}

export default Select;