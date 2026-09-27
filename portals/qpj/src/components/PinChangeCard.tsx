import { Button } from '@p31ca/design-core/compositions';
import { useRef, useState } from 'react';
import { useQpjStore } from '../store/useQpjStore';
import { PinDialog } from './PinDialog';

type Step = 'idle' | 'verify' | 'new';

export function PinChangeCard() {
  const caregiverPin = useQpjStore((s) => s.caregiverPin);
  const setCaregiverPin = useQpjStore((s) => s.setCaregiverPin);
  const showToast = useQpjStore((s) => s.showToast);
  const [step, setStep] = useState<Step>('idle');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submitNew = (pin: string) => {
    if (pin.length === 4 && /^\d{4}$/.test(pin)) {
      setCaregiverPin(pin);
      showToast('Caregiver PIN updated', 'success');
      setStep('idle');
      setNewPin('');
    } else {
      setError(true);
      window.setTimeout(() => setError(false), 500);
      setNewPin('');
      inputRef.current?.focus();
    }
  };

  if (step === 'verify') {
    return (
      <PinDialog
        title="Current caregiver PIN"
        description="Enter the PIN you use today to confirm it's you, then you can set a new one."
        onSuccess={(pin) => {
          if (pin === caregiverPin) {
            setStep('new');
          } else {
            showToast('Wrong PIN — keep it gentle', 'error');
          }
        }}
        onCancel={() => setStep('idle')}
      />
    );
  }

  return (
    <section className="pin-change card" aria-label="Caregiver door settings">
      <div className="pin-change__copy">
        <h2 className="section-eyebrow">Caregiver door</h2>
        <p className="pin-change__lede">
          The 4-digit PIN that opens craft and workshop doors for a grown-up session.
          Everyone starts at <strong>1234</strong> — change it to something only you know.
        </p>
      </div>

      {step === 'new' ? (
        <div className="pin-change__panel">
          <div className="pin-change__form" role="group" aria-label="New caregiver PIN">
          <input
            ref={inputRef}
            className="pin-dialog__input"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={4}
            value={newPin}
            data-error={error || undefined}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
              setNewPin(digits);
              if (digits.length === 4) submitNew(digits);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitNew(newPin);
              if (e.key === 'Escape') setStep('idle');
            }}
            aria-label="New 4-digit caregiver PIN"
            autoFocus
          />
          <p className="pin-change__actions">
            <Button type="button" variant="ghost" onClick={() => setStep('idle')}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={newPin.length < 4}
              onClick={() => submitNew(newPin)}
            >
              Set new PIN
            </Button>
          </p>
          {error && (
            <p className="pin-dialog__error" role="alert">
              That's not quite right — 4 digits, please.
            </p>
          )}
        </div>
      </div>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setStep('verify')}>
          Change caregiver PIN
        </Button>
      )}
    </section>
  );
}