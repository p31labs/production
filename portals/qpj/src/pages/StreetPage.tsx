import { Button } from '@p31/design-core/compositions';
import { useState } from 'react';
import { useQpjStore } from '../store/useQpjStore';
import { useSimulatedPresence } from '../hooks/useSimulatedPresence';
import { useIdentityPrompt } from '../hooks/useIdentityPrompt';
import { getPassport, PASSENGER_IDS, type PassportId } from '../lib/passports';
import { navigateTo } from '../lib/routes';
import { BatteryRing } from '../components/BatteryRing';
import { VoiceButton } from '../components/VoiceButton';
import { Confetti } from '../components/Confetti';
import { LOVELedgerCard } from '../components/LOVELedgerCard';

const GREETINGS = [
  'Good morning',
  'Hi',
  'Hey',
  'Howdy',
  'Greetings, neighbor',
  'Ciao',
  'Shalom',
  'Hola',
];

function greetingFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return GREETINGS[hash % GREETINGS.length];
}

export function StreetPage() {
  const passportId = useQpjStore((s) => s.passportId);
  const spoons = useQpjStore((s) => s.spoons);
  const presence = useQpjStore((s) => s.presence);
  const treatsReceived = useQpjStore((s) => s.treatsReceived);
  const addTreats = useQpjStore((s) => s.addTreats);
  const setTalkTarget = useQpjStore((s) => s.setTalkTarget);
  const pushTalk = useQpjStore((s) => s.pushTalk);
  const [lastTreat, setLastTreat] = useState(0);

  useSimulatedPresence(passportId);

  const { needsIdentity, openEntry } = useIdentityPrompt();

  const me = getPassport(passportId);
  const onlineCount = PASSENGER_IDS.filter((id) => id !== passportId && presence[id]?.online).length;

  const openTalk = (target: PassportId | 'family') => {
    setTalkTarget(target);
    navigateTo('talk');
  };

  const runVoice = (text: string) => {
    const t = text.toLowerCase();
    if (t.includes('craft')) {
      navigateTo('craft');
    } else if (t.includes('workshop')) {
      navigateTo('workshop');
    } else if (t.includes('talk') || t.includes('message') || t.includes('family')) {
      openTalk('family');
    } else if (t.includes('street') || t.includes('home')) {
      navigateTo('street');
    } else if (t.includes('how are you') || t.includes('who is home')) {
      addTreats(1);
      pushTalk({ from: 'gherkin', kind: 'system', body: `${me.pickledName} asked “${text.trim()}” — the fam is home 🏡` });
      openTalk('family');
    } else if (t.includes('plus one') || t.includes('treat')) {
      addTreats(1);
    } else {
      pushTalk({ from: 'gherkin', kind: 'system', body: `“${text.trim()}” added to the family notebook.` });
      setTalkTarget('family');
      navigateTo('talk');
    }
  };

  const onTreat = () => {
    addTreats(1);
    setLastTreat(treatsReceived + 1);
  };

  return (
    <main className="page street" id="street">
      <Confetti fireKey={lastTreat} />

      <section className="street__head" aria-labelledby="street-greeting">
        <h1 id="street-greeting" className="street__greeting">
          {greetingFor(me.pickledName)}, {me.pickledName}
        </h1>
        <p className="street__sub">
          {onlineCount > 0
            ? `${onlineCount} light${onlineCount === 1 ? '' : 's'} on in the street.`
            : 'The street is quiet — the lamps are waiting.'}
        </p>
      </section>
      {needsIdentity && (
        <section className="street__guest card" aria-label="Set up your shelf">
          <p className="street__guest-copy">
            <span aria-hidden="true">🔑</span> Set up your shelf to keep what you make — keys stay on this device.
          </p>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={openEntry}
          >
            Set up your shelf →
          </Button>
        </section>
      )}

      <section className="street__energy" aria-label="Your energy">
        <BatteryRing level={spoons} />
        <div className="street__energy-cta">
          <VoiceButton
            onResult={runVoice}
            label="Talk to the jar"
            ariaLabel="Speak a command: craft, workshop, who is home"
          />
        </div>
      </section>

      <section className="street__houses" aria-label="Neighbors on the street">
        <h2 className="section-eyebrow">The street</h2>
        <div className="house-grid">
          <button
            type="button"
            className="house-card house-card--you"
            onClick={() => openTalk('family')}
          >
            <span className="house-card__avatar" aria-hidden="true">
              {me.emoji}
            </span>
            <span className="house-card__name">Family notebook</span>
            <span className="house-card__status">everyone · ✉️</span>
          </button>

          {PASSENGER_IDS.filter((id) => id !== passportId).map((id) => {
            const person = getPassport(id);
            const node = presence[id];
            const online = Boolean(node?.online);
            return (
              <button
                key={id}
                type="button"
                className={`house-card${online ? ' house-card--lit' : ' house-card--dim'}`}
                onClick={() => openTalk(id)}
                aria-label={`${online ? 'Say hi to' : 'See'} ${person.pickledName}`}
              >
                <span className="house-card__avatar" aria-hidden="true">
                  {person.emoji}
                </span>
                <span className="house-card__name">{person.pickledName}</span>
                <span className="house-card__status">
                  {online ? (
                    <>
                      <span className="lantern-dot" data-lit="true" aria-hidden="true" />
                      home · {node?.spoons ?? 3} spoons
                    </>
                  ) : (
                    <>
                      <span className="lantern-dot" aria-hidden="true" />
                      away
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="street__treats" aria-label="Treat jar">
        <button
          type="button"
          className="treat-button"
          onClick={onTreat}
          aria-label={`Collect a treat (${treatsReceived} so far)`}
        >
          <span aria-hidden="true">🍖</span>
          <span>Pickle a treat</span>
          <span className="treat-button__count">×{treatsReceived}</span>
        </button>
      </section>

      <LOVELedgerCard />
    </main>
  );
}