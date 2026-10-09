/**
 * harness-streaming.tsx — the Wave 7 behavioural harness.
 *
 * Drives the PRODUCTION streaming machinery (threadStore's rAF batching,
 * Composer's Stop contract) without a backend, so the e2e can assert what a
 * unit test cannot: how many store updates a 100-event burst actually causes,
 * and whether Stop is in the DOM during a turn that has produced no tokens.
 *
 * Controls:
 *   Send (composer) — onSend returns a promise that NEVER resolves: Phase 1
 *                     (thinking, zero tokens). Stop must render regardless.
 *   #phase2         — apply phase.started, then stream content slowly, so the
 *                     test can stop mid-Phase-2.
 *   #pump           — 100 message.content events, one per macrotask; the test
 *                     reads window.__updates (store setState count).
 */
import { createRoot } from 'react-dom/client';
import { Composer } from './src/shell/chat/Composer';
import { useChatThreadStore } from './src/shell/chat/threadStore';
import './src/index.css';

const SESSION = 'streaming-harness';
let updates = 0;

const win = window as unknown as {
  __updates?: number;
  __streaming?: () => boolean;
  __pump?: (n: number) => Promise<void>;
  __phase2?: () => void;
  __reset?: () => void;
};

useChatThreadStore.subscribe(() => {
  updates += 1;
  win.__updates = updates;
});

const contentEvent = (i: number) =>
  ({
    type: 'message.content',
    id: String(i),
    sessionId: SESSION,
    role: 'assistant',
    messageKey: 'harness-stream',
    text: `token-${i} `.repeat(i),
  }) as never;

function App() {
  const streaming = useChatThreadStore((s) => s.streaming);
  const messages = useChatThreadStore((s) => s.messages);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div>
        <button id="pump" type="button" onClick={() => { win.__reset?.(); void win.__pump?.(100); }}>pump</button>
        <button id="phase2" type="button" onClick={() => win.__phase2?.()}>phase2</button>
      </div>
      <div className="chat-thread" data-updates={String(win.__updates ?? 0)}>
        {messages.map((m) => (
          <div key={m.id} data-message-id={m.id}>{m.text.slice(0, 80)}</div>
        ))}
      </div>
      <Composer
        placeholder="Message"
        canSend
        streaming={streaming}
        onSend={() => {
          // Phase 1: the turn is live but no token will ever arrive.
          useChatThreadStore.setState({ streaming: true, error: null });
          return new Promise<void>(() => { /* never settles */ });
        }}
        onAbort={() => useChatThreadStore.setState({ streaming: false })}
      />
    </div>
  );
}

win.__streaming = () => useChatThreadStore.getState().streaming;
win.__reset = () => {
  updates = 0;
  win.__updates = 0;
  useChatThreadStore.getState().clear();
};
win.__pump = (n: number) =>
  new Promise<void>((resolve) => {
    // One event per macrotask, all armed at once: a burst that lands inside a
    // single frame. A real stream is slower than this; the batching invariant
    // (updates track FRAMES, not events) is what the test measures.
    let fired = 0;
    for (let i = 1; i <= n; i++) {
      setTimeout(() => {
        useChatThreadStore.getState().apply(contentEvent(i));
        fired += 1;
        if (fired >= n) resolve();
      }, 0);
    }
  });
win.__phase2 = () => {
  useChatThreadStore.getState().apply({ type: 'phase.started', sessionId: SESSION, name: 'response' } as never);
  let i = 100;
  const tick = () => {
    useChatThreadStore.getState().apply(contentEvent(i));
    i += 1;
    setTimeout(tick, 40); // slow enough for the test to click Stop mid-stream
  };
  setTimeout(tick, 40);
};

createRoot(document.getElementById('root')!).render(<App />);
