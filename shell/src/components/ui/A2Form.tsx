import { CSSProperties, FormEvent } from 'react';

export interface A2FormField {
  name: string;
  label?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}

export interface A2FormProps {
  title?: React.ReactNode;
  fields: A2FormField[];
  submitAction?: string;
  submitLabel?: string;
  style?: CSSProperties;
  onAction?: (action: string, payload?: unknown, el?: HTMLElement) => void;
}

export default function A2Form({ title, fields, submitAction, submitLabel = 'Submit', style, onAction }: A2FormProps) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!submitAction || !onAction) return;
    const data = new FormData(e.currentTarget);
    const payload: Record<string, string> = {};
    for (const f of fields) {
      const v = data.get(f.name);
      if (v != null) payload[f.name] = String(v);
    }
    onAction(submitAction, payload, e.currentTarget);
  };

  return (
    <form className="glass-card" style={style} onSubmit={handleSubmit}>
      {title ? <h3 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 var(--p31-space-tiny)' }}>{title}</h3> : null}
      {fields.map((f) => (
        <div key={f.name} style={{ marginBottom: 'var(--p31-space-tiny)' }}>
          <label
            htmlFor={`a2ui-${f.name}`}
            style={{ fontSize: 11, color: 'var(--p31-text-secondary)', display: 'block', marginBottom: 2 }}
          >
            {f.label ?? f.name}
            {f.required ? <span style={{ color: 'var(--p31-accent-red)' }}> *</span> : null}
          </label>
          <input
            id={`a2ui-${f.name}`}
            name={f.name}
            type={f.type ?? 'text'}
            required={f.required}
            placeholder={f.placeholder}
            style={{
              width: '100%',
              padding: 'var(--p31-space-tiny)',
              background: 'var(--p31-glass-bg)',
              border: '1px solid var(--p31-glass-border)',
              borderRadius: 'var(--p31-radius-sm)',
              color: 'var(--p31-text)',
              fontSize: 12,
              minHeight: 36,
            }}
          />
        </div>
      ))}
      {submitAction ? (
        <button type="submit" className="btn primary" style={{ width: '100%', marginTop: 'var(--p31-space-tiny)' }}>
          {submitLabel}
        </button>
      ) : null}
    </form>
  );
}
