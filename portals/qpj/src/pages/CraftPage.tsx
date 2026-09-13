import { useState } from 'react';
import { useQpjStore } from '../store/useQpjStore';
import { getPassport } from '../lib/passports';
import { Confetti } from '../components/Confetti';
import { Button } from '@p31/design-core/compositions';

const ARTIFACTS = [
  { id: 'star', emoji: '⭐', name: 'A pickle-star' },
  { id: 'radar', emoji: '📡', name: 'A family radar' },
  { id: 'song', emoji: '🎵', name: 'A street-song' },
  { id: 'key', emoji: '🗝️', name: 'A room-key for the jar' },
  { id: 'rocket', emoji: '🚀', name: 'A tiny rocket' },
  { id: 'quilt', emoji: '🪡', name: 'A night-quilt square' },
] as const;

const LAUNCH_ROOMS = ['#/street', '#/you', '#/talk'];

export function CraftPage() {
  const passportId = useQpjStore((s) => s.passportId);
  const spoons = useQpjStore((s) => s.spoons);
  const addTreats = useQpjStore((s) => s.addTreats);
  const setSpoons = useQpjStore((s) => s.setSpoons);
  const pushTalk = useQpjStore((s) => s.pushTalk);
  const showToast = useQpjStore((s) => s.showToast);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [artifact, setArtifact] = useState<(typeof ARTIFACTS)[number] | null>(null);
  const [name, setName] = useState('');
  const [launched, setLaunched] = useState(0);

  const me = getPassport(passportId);
  const craftCost = spoons >= 3 ? 1 : 0;

  const finish = () => {
    if (!artifact) return;
    const finalName = name.trim() || artifact.name;
    addTreats(2);
    setSpoons(spoons - craftCost);
    useQpjStore.getState().earnLove('artifact', me.pickledName);
    pushTalk({ from: me.id, kind: 'system', body: `Launched “${finalName}” ${artifact.emoji} into the family sky.` });
    setLaunched((n) => n + 1);
    showToast(`“${finalName}” launched`, 'success');
    window.setTimeout(() => {
      window.location.hash = LAUNCH_ROOMS[Math.floor(Math.random() * LAUNCH_ROOMS.length)];
    }, 1800);
  };

  return (
    <main className="page craft" id="craft">
      <Confetti fireKey={launched} />

      <div className="craft__steps" aria-label="Craft progress">
        <span className={step >= 1 ? 'craft__step--active' : ''}>1 · Pick</span>
        <span className={step >= 2 ? 'craft__step--active' : ''}>2 · Name</span>
        <span className={step >= 3 ? 'craft__step--active' : ''}>3 · Launch</span>
      </div>

      {step === 1 && (
        <section className="craft__panel card" aria-labelledby="craft-pick">
          <h1 id="craft-pick" className="craft__title">
            What are {me.pickledName} making today, {me.pickledName}?
          </h1>
          <div className="craft__grid">
            {ARTIFACTS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`craft-option${artifact?.id === a.id ? ' craft-option--active' : ''}`}
                onClick={() => setArtifact(a)}
              >
                <span className="craft-option__emoji" aria-hidden="true">{a.emoji}</span>
                <span className="craft-option__name">{a.name}</span>
              </button>
            ))}
          </div>
          <div className="craft__nav">
            <Button variant="primary" disabled={!artifact} onClick={() => setStep(2)}>
              Name it →
            </Button>
          </div>
        </section>
      )}

      {step === 2 && artifact && (
        <section className="craft__panel card" aria-labelledby="craft-name">
          <h1 id="craft-name" className="craft__title">
            Give it a name
          </h1>
          <div className="craft__object" aria-hidden="true">
            <span className="craft-option__emoji">{artifact.emoji}</span>
          </div>
          <input
            className="craft__name-input"
            type="text"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            placeholder={`e.g. ${artifact.name.toLowerCase()}`}
            aria-label="Name your creation"
          />
          <div className="craft__nav">
            <Button variant="ghost" onClick={() => setStep(1)}>← Back</Button>
            <Button variant="primary" onClick={() => setStep(3)}>Launch →</Button>
          </div>
        </section>
      )}

      {step === 3 && artifact && (
        <section className="craft__panel card" aria-labelledby="craft-launch">
          <h1 id="craft-launch" className="craft__title">
            Ready to launch?
          </h1>
          <p className="craft__summary">
            <span className="craft-option__emoji" aria-hidden="true">{artifact.emoji}</span>
            {name.trim() || artifact.name}
          </p>
          <p className="craft__cost">
            {craftCost > 0 ? `Costs ${craftCost} spoon${craftCost > 1 ? 's' : ''} today.` : 'Free for you today — you’ve got spoons to spare.'}
          </p>
          <div className="craft__nav">
            <Button variant="ghost" onClick={() => setStep(2)}>← Back</Button>
            <Button variant="primary" onClick={finish}>
              {launched > 0 ? 'Launch another' : 'Launch'}
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}