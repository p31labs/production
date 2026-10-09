/**
 * shell/chat/Composer.tsx — the composer primitive.
 *
 * Input + send, with a real abort: cancelling aborts the in-flight POST via
 * AbortController and closes the live stream. Disabled when the role cannot
 * send (authz) or a turn is already in flight.
 */
import { useRef, useState } from 'react';

export interface ComposerProps {
  /** The placeholder (softened at low spoons by the presentation selector). */
  placeholder: string;
  /** Whether this role may send. */
  canSend: boolean;
  /** Whether a turn is streaming (Phase 1 or Phase 2) — keeps Stop visible. */
  streaming?: boolean;
  /** Called on send with the text and an AbortSignal for the turn. A returned
   *  promise keeps `sending` (and therefore Stop) alive until the turn's POST
   *  settles — Phase 1 runs before any token arrives. */
  onSend(text: string, signal: AbortSignal): void | Promise<void>;
  /** Called on abort. */
  onAbort(): void;
}

export function Composer({ placeholder, canSend, streaming = false, onSend, onAbort }: ComposerProps) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const active = sending || streaming;

  const send = () => {
    if (!input.trim() || !canSend || active) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    const controller = new AbortController();
    controllerRef.current = controller;
    // Clear `sending` when the turn's POST settles (or fails), not on the next
    // render — Stop stays up for the whole turn, then Send comes back.
    void Promise.resolve(onSend(text, controller.signal)).finally(() => {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setSending(false);
      }
    });
  };

  const abort = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setSending(false);
    onAbort();
  };

  return (
    <div className="chat-composer">
      <textarea
        className="chat-composer__input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        disabled={!canSend}
        rows={2}
        aria-label="Message"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
      />
      {active ? (
        <button type="button" className="chat-composer__send chat-composer__send--stop" onClick={abort}>
          Stop
        </button>
      ) : (
        <button type="button" className="chat-composer__send" onClick={send} disabled={!canSend || !input.trim()}>
          Send
        </button>
      )}
    </div>
  );
}