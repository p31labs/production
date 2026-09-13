import { useState } from 'react';
import { Button } from '@p31/design-core/compositions';
import { createIdentity } from '../../lib/identity';
import { generatePickleName } from '../../lib/pickleNames';
import { PASSENGERS } from '../../lib/passports';
import type { PassportId } from '../../lib/passports';
import { useQpjStore } from '../../store/useQpjStore';
import { ONBOARDING_STEPS } from './onboarding-copy';
import './onboarding.css';

interface OnboardingFlowProps {
  passportId: PassportId;
  onDone: () => void;
}

const HUES: { hue: number; label: string }[] = [
  { hue: 75, label: 'amber' },
  { hue: 145, label: 'sage' },
  { hue: 235, label: 'sky' },
  { hue: 285, label: 'grape' },
  { hue: 350, label: 'rose' },
];

export function OnboardingFlow({ passportId, onDone }: OnboardingFlowProps) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [passport, setPassport] = useState<PassportId>(passportId);
  const [name, setName] = useState(PASSENGERS[passport]?.pickledName ?? 'Dillpickle');
  const [avatar, setAvatar] = useState(PASSENGERS[passport]?.emoji ?? '🧸');
  const [hue, setHue] = useState<number>(PASSENGERS[passport]?.accentHue ?? 75);

  const create = async () => {
    const identity = await createIdentity(passportId, { name, avatar, accentHue: hue, pickleName: generatePickleName(passportId) });
    useQpjStore.getState().setIdentity(passport, identity);
    useQpjStore.getState().earnLove('identity', generatePickleName(passportId));
    onDone();
  };

  return (
    <div className="onboarding" role="region" aria-label="Set up your identity">
      <div className="onboarding__steps" aria-hidden="true">
        {[0, 1, 2, 3].map((s) => (
          <span
            key={s}
            className={`onboarding__dot${s === step ? ' is-active' : ''}${s < step ? ' is-done' : ''}`}
          />
        ))}
      </div>

      {step === 0 && (
        <section className="onboarding__panel">
          <h2 className="section-eyebrow">{ONBOARDING_STEPS[0].eyebrow}</h2>
          <div className="onboarding__grid">
            {Object.entries(PASSENGERS).map(([id, p]) => (
              <button
                key={id}
                type="button"
                className={`onboarding__passport${passport === id ? ' is-active' : ''}`}
                onClick={() => setPassport(id as PassportId)}
                aria-pressed={passport === id}
              >
                <span aria-hidden="true">{p.emoji}</span>
                <span>{p.pickledName}</span>
                <span className="onboarding__role">{p.role}</span>
              </button>
            ))}
          </div>
          <div className="onboarding__actions">
            <Button size="sm" onClick={() => setStep(1)}>Next</Button>
          </div>
          <p className="onboarding__consequence" aria-live="polite">{ONBOARDING_STEPS[0].consequence}</p>
        </section>
      )}

      {step === 1 && (
        <section className="onboarding__panel">
          <h2 className="section-eyebrow">{ONBOARDING_STEPS[1].eyebrow}</h2>
          <label className="onboarding__field">
            <span>Name</span>
            <input
              className="onboarding__input"
              value={name}
              maxLength={18}
              onChange={(e) => setName(e.target.value)}
              aria-label="Your name"
            />
          </label>
          <label className="onboarding__field">
            <span>Avatar</span>
            <select
              className="onboarding__input"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              aria-label="Your avatar"
            >
              {Object.values(PASSENGERS).map((p) => (
                <option key={p.id} value={p.emoji}>{p.emoji} {p.pickledName}</option>
              ))}
            </select>
          </label>
          <div className="onboarding__actions">
            <Button size="sm" variant="ghost" onClick={() => setStep(0)}>Back</Button>
            <Button size="sm" onClick={() => setStep(2)}>Next</Button>
          </div>
          <p className="onboarding__consequence" aria-live="polite">{ONBOARDING_STEPS[1].consequence}</p>
        </section>
      )}

      {step === 2 && (
        <section className="onboarding__panel">
          <h2 className="section-eyebrow">{ONBOARDING_STEPS[2].eyebrow}</h2>
          <div className="onboarding__hues" role="radiogroup" aria-label="Accent color">
            {HUES.map(({ hue: h, label }) => (
              <button
                key={h}
                type="button"
                className={`onboarding__hue${hue === h ? ' is-active' : ''}`}
                style={{ background: `oklch(65% 0.18 ${h})` }}
                onClick={() => setHue(h)}
                aria-pressed={hue === h}
                title={label}
                aria-label={label}
              />
            ))}
          </div>
          <div className="onboarding__actions">
            <Button size="sm" variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button size="sm" onClick={() => setStep(3)}>Next</Button>
          </div>
          <p className="onboarding__consequence" aria-live="polite">{ONBOARDING_STEPS[2].consequence}</p>
        </section>
      )}

      {step === 3 && (
        <section className="onboarding__panel onboarding__panel--done">
          <h2 className="section-eyebrow">{ONBOARDING_STEPS[3].eyebrow}</h2>
          <p className="onboarding__copy">
            {ONBOARDING_STEPS[3].body} {ONBOARDING_STEPS[3].consequence}
          </p>
          <div className="onboarding__actions">
            <Button size="sm" variant="ghost" onClick={() => setStep(2)}>Back</Button>
            <Button size="sm" onClick={create}>Claim my identity</Button>
          </div>
        </section>
      )}
    </div>
  );
}
