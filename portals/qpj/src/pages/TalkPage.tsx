import { useRef, useState } from 'react';
import { ChatShell } from '@p31/design-core/compositions';
import { useQpjStore, type TalkMessage } from '../store/useQpjStore';
import { getPassport, PASSENGER_IDS } from '../lib/passports';
import { navigateTo } from '../lib/routes';
import { useIdentityPrompt } from '../hooks/useIdentityPrompt';
import { VoiceButton } from '../components/VoiceButton';
import { Button } from '@p31/design-core/compositions';

const BOT_REPLIES: Record<string, string[]> = {
  dillpickle: ['Ooh, tell me more! 🧸', 'Can we make it tomorrow too?', 'I put a star on the jar.'],
  breadbutter: ['Copy that. Logging it.', 'Nice — wanna synth it?', 'Rebooting the radio… okay go.'],
  cornichon: ['Come by for tea, dear.', 'The garden says hello.', 'I saved you seeds 🌱'],
  gherkin: ['Goodness, you planned that well.', 'Tell me everything over dinner.', 'The jar is stocked for you.'],
  halfsour: ['Great question — let me whiteboard it.', 'That’s the pickle, exactly.', 'Send it to the workshop ship.'],
};

function bubble(person: string, text: string) {
  return BOT_REPLIES[person]?.[Math.abs(hashStr(text)) % (BOT_REPLIES[person]?.length ?? 1)] ?? 'The street hears you 💛';
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function FormattedTime({ sentAt }: { sentAt: number }) {
  const d = new Date(sentAt);
  return <span className="talk-bubble__time">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>;
}

export function TalkPage() {
  const passportId = useQpjStore((s) => s.passportId);
  const talkTarget = useQpjStore((s) => s.talkTarget);
  const talkMessages = useQpjStore((s) => s.talkMessages);
  const pushTalk = useQpjStore((s) => s.pushTalk);
  const presence = useQpjStore((s) => s.presence);
  const [draft, setDraft] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const [pendingDraft, setPendingDraft] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);

  const { needsIdentity, openEntry } = useIdentityPrompt();

  const targetName = talkTarget === 'family' ? 'Family notebook' : getPassport(talkTarget).pickledName;
  const identity = useQpjStore((s) => s.identity);

  const doSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    pushTalk({ from: passportId, kind: 'text', body: trimmed });
    useQpjStore.getState().earnLove('talk', getPassport(passportId).pickledName);
    window.setTimeout(() => {
      pushTalk({ from: talkTarget, kind: 'text', body: bubble(talkTarget, trimmed) });
    }, 900);
    setDraft('');
  };

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (needsIdentity) {
      setPendingDraft(trimmed);
      setNudgeOpen(true);
      return;
    }
    doSend(trimmed);
  };

  return (
    <main className="page talk" id="talk">
      <ChatShell
        drawerLabel="Who’s home"
        drawerOpen={drawerOpen}
        onCloseDrawer={() => setDrawerOpen(false)}
        drawer={
          <div className="talk-drawer-list">
            {PASSENGER_IDS.filter((id) => id !== passportId).map((id) => {
              const person = getPassport(id);
              const online = Boolean(presence[id]?.online);
              return (
                <button
                  key={id}
                  type="button"
                  className={`talk-drawer-item${talkTarget === id ? ' talk-drawer-item--active' : ''}`}
                  onClick={() => useQpjStore.setState({ talkTarget: id })}
                >
                  <span aria-hidden="true">{person.emoji}</span>
                  <span>{person.pickledName}</span>
                  <span className="lantern-dot" data-lit={online ? 'true' : undefined} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        }
        header={
          <div className="talk-header">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateTo('street')}
              aria-label="Back to the street"
            >
              ← Back
            </Button>
            <h1 className="talk-header__title">{targetName}</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDrawerOpen(true)}
              aria-label="Who’s home? Open the drawer"
            >
              Who’s home
            </Button>
          </div>
        }
      >
        <div className="talk-body" ref={bodyRef} aria-live="polite">
          {talkMessages.length === 0 ? (
            <p className="talk-empty">
              Say hi to {targetName} — the street light is on.
            </p>
          ) : (
            talkMessages.map((message: TalkMessage) => {
              const mine = message.from === passportId;
              const isGuest = mine && identity.status !== 'ready';
              return (
                <div key={message.id} className={`talk-bubble wrap${mine ? ' wrap--mine' : ''}${isGuest ? ' wrap--guest' : ''}`} data-guest={isGuest ? 'true' : undefined}>
                  <div className={`talk-bubble__inner${mine ? ' talk-bubble__inner--mine' : ''}`}>
                    {message.kind === 'voice' && <span className="talk-bubble__kind">🎙️</span>}
                    <span className="talk-bubble__text">{message.body}</span>
                    <FormattedTime sentAt={message.sentAt} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="talk-composer">
          <VoiceButton onResult={(t) => send(t)} size="md" ariaLabel="Speak a message" />
          <input
            className="talk-composer__input"
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(draft)}
            placeholder={`Message ${targetName}…`}
            aria-label={`Message ${targetName}`}
          />
          <Button
            variant="primary"
            size="md"
            disabled={!draft.trim()}
            onClick={() => send(draft)}
            aria-label="Send message"
          >
            Send
          </Button>
        </div>
      </ChatShell>

      {nudgeOpen && (
        <div className="nudge-backdrop" role="presentation">
          <div role="dialog" aria-modal="true" aria-label="Set up your shelf" className="nudge card">
            <h2 className="nudge__title">Got something to say?</h2>
            <p className="nudge__copy">
              Set up your shelf first and this note lands on <strong>{targetName}</strong>
              ’s street with your name on it. Keys stay on this device.
            </p>
            <div className="nudge__actions">
              <Button size="sm" variant="primary" onClick={openEntry}>
                Set up your shelf →
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setNudgeOpen(false);
                  doSend(pendingDraft);
                }}
              >
                Send as guest
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}