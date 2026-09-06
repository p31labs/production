import { useState } from 'react';
import { configApi, type ConfigCategory } from '../api/config';

interface ConfigFieldProps {
  label: string;
  placeholder?: string;
  category: ConfigCategory;
  hint?: string;
  defaultValue?: string;
  isSecret?: boolean;
  onValueChange?: (value: string) => void;
}

type FieldStatus = 'idle' | 'testing' | 'ok' | 'error';

export default function ConfigField({
  label,
  placeholder,
  category,
  hint,
  defaultValue = '',
  isSecret = false,
  onValueChange,
}: ConfigFieldProps) {
  const [value, setValue] = useState(defaultValue);
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
      const result = await configApi.validate(category, label, value);
      setStatus(result.valid ? 'ok' : 'error');
      setMessage(result.message || (result.valid ? 'Valid' : 'Invalid'));
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : 'Test failed');
    }
  };

  const handleChange = (v: string) => {
    setValue(v);
    setStatus('idle');
    setMessage('');
    onValueChange?.(v);
  };

  const statusClass = status === 'ok' ? 'ok' : status === 'error' ? 'error' : '';

  return (
    <div className="config-field">
      <div className="config-field-label">
        <span>{label}</span>
        {hint && <span className="config-field-hint">{hint}</span>}
      </div>
      <div className="config-field-row">
        <input
          type={isSecret ? 'password' : 'text'}
          className="setting-input"
          value={value}
          data-field={label}
          placeholder={placeholder}
          onChange={(e) => handleChange(e.target.value)}
        />
        {category !== 'feature' && (
          <button
            className={`btn btn-secondary config-test-btn ${statusClass}`}
            onClick={handleTest}
            disabled={status === 'testing'}
          >
            {isSecret ? '—' : status === 'testing' ? 'Testing…' : 'Test'}
          </button>
        )}
      </div>
      {message && <div className={`config-field-message ${statusClass}`}>{message}</div>}
    </div>
  );
}
