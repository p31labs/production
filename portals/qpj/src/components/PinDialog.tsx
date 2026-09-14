import { Button } from '@p31/design-core/compositions';
import { useEffect, useRef, useState } from 'react';

export interface PinDialogProps {
  title: string;
  description: string;
  pinLength?: number;
  onSuccess: (pin: string) => void;
  onCancel: () => void;
}

export function PinDialog({
  title,
  description,
  pinLength = 4,
  onSuccess,
  onCancel,
}: PinDialogProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = (entered: string) => {
    if (entered.length === pinLength) {
      onSuccess(entered);
    } else {
      setError(true);
      window.setTimeout(() => setError(false), 500);
      setValue('');
      inputRef.current?.focus();
    }
  };

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener('keydown', onKey);
    return () => {
      panel.removeEventListener('keydown', onKey);
      trigger?.focus();
    };
  }, []);

  return (
    <div className="pin-dialog" role="dialog" aria-modal="true" aria-label={title}>
      <div className="pin-dialog__panel" data-error={error || undefined} ref={panelRef}>
        <h2 className="pin-dialog__title">{title}</h2>
        <p className="pin-dialog__desc">{description}</p>
        <input
          ref={inputRef}
          className="pin-dialog__input"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={pinLength}
          value={value}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, pinLength);
            setValue(digits);
            if (digits.length === pinLength) {
              submit(digits);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit(value);
            if (e.key === 'Escape') onCancel();
          }}
          aria-label="4-digit caregiver PIN"
          autoFocus
        />
        <div className="pin-dialog__actions">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Back to the street
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={value.length < pinLength}
            onClick={() => submit(value)}
          >
            Unlock
          </Button>
        </div>
        {error && (
          <p className="pin-dialog__error" role="alert">
            That's not quite right — 4 digits, please.
          </p>
        )}
      </div>
    </div>
  );
}