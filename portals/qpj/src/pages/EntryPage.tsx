import { Button } from '@p31ca/design-core/compositions';
import { useQpjStore } from '../store/useQpjStore';
import { getPassport } from '../lib/passports';
import { navigateTo } from '../lib/routes';
import { useIdentity } from '../hooks/useIdentity';
import { OnboardingFlow } from './you/OnboardingFlow';

export function EntryPage() {
  const passportId = useQpjStore((s) => s.passportId);
  const { status, verify } = useIdentity(passportId);
  const me = getPassport(passportId);

  if (status === 'loading' || status === 'unknown') {
    return (
      <main className="page entry" id="entry">
        <p className="entry__status" aria-live="polite">Checking your shelf…</p>
      </main>
    );
  }

  if (status === 'ready') {
    return (
      <main className="page entry" id="entry">
        <section className="entry__ready card" aria-label="Already set up">
          <p className="entry__ready-emoji" aria-hidden="true">🥒</p>
          <h1 className="entry__ready-title">Your shelf is set up, {me.pickledName}</h1>
          <p className="entry__ready-copy">
            Keys already live on this device. Head back to the street.
          </p>
          <Button type="button" variant="primary" onClick={() => navigateTo('street')}>
            Back to the street →
          </Button>
        </section>
      </main>
    );
  }

  const onDone = () => {
    void verify();
    navigateTo('street');
  };

  return (
    <main className="page entry" id="entry">
      <section className="entry__intro">
        <h1 className="entry__title">Welcome to the jar</h1>
        <p className="entry__sub">
          The jar is your family’s corner of the street. No accounts, no email — the
          key is made here and stays on this device. If it ever gets lost, the family
          mesh can help you back in.
        </p>
      </section>
      <OnboardingFlow passportId={passportId} onDone={onDone} />
    </main>
  );
}