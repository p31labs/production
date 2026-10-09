import { useState } from 'react';
import { configApi, type ConfigCategory } from '../api/config';

interface ConfigFieldProps {
  key_?: string;
  label: string;
  placeholder?: string;
  category: ConfigCategory;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  isSecret?: boolean;
}

type FieldStatus = 'idle' | 'testing' | 'ok' | 'error';

/** ConfigField — QM config input with a Test button (validates against the gateway). */
export function ConfigField({
  key_,
  label,
  placeholder,
  category,
  hint,
  value,
  onChange,
  isSecret = false,
}: ConfigFieldProps) {
  const [status, setStatus] = useState<FieldStatus>('idle');
  const [message, setMessage] = useState('');

  const handleTest = async () => {
    if (!value.trim()) {
      setStatus('error');
      setMessage('Enter a value first');
      return;
    }
    setStatus('testing');
    setMessage('Testing…');
    try {
      const result = await configApi.validate(category, key_ ?? label, value);
      setStatus(result.valid ? 'ok' : 'error');
      setMessage(result.message || (result.valid ? 'Valid' : 'Invalid'));
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : 'Test failed');
    }
  };

  const handleChange = (v: string) => {
    onChange(v);
    setStatus('idle');
    setMessage('');
  };

  return (
    <div className="field" style={{ marginBlockEnd: 'var(--p31-space-4)' }}>
      <label htmlFor={`cfg-${key_ ?? label}`}>
        {label}
        {hint && <span style={{ textTransform: 'none', letterSpacing: 'normal', marginLeft: 8 }}>{hint}</span>}
      </label>
      <div style={{ display: 'flex', gap: 'var(--p31-space-2)', alignItems: 'flex-start' }}>
        <input
          id={`cfg-${key_ ?? label}`}
          type={isSecret ? 'password' : 'text'}
          value={value}
          placeholder={placeholder}
          onChange={(e) => handleChange(e.target.value)}
          style={{ flex: 1 }}
        />
        {category !== 'feature' && (
          <button className="btn btn-glass" type="button" onClick={handleTest} disabled={status === 'testing'} style={{ minWidth: 88 }}>
            {status === 'testing' ? 'Testing…' : 'Test'}
          </button>
        )}
      </div>
      {message && (
        <span style={{ fontSize: 'var(--p31-text-xs)', color: status === 'ok' ? 'var(--p31-accent-green)' : status === 'error' ? 'var(--p31-accent-red)' : 'var(--p31-cloud)' }}>
          {message}
        </span>
      )}
    </div>
  );
}

export default ConfigField;