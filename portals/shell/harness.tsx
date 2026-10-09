/**
 * harness.tsx — a minimal mount of the real Thread, for the behavioural gate.
 *
 * Renders 200 synthetic messages through the production Thread (virtualized,
 * end-anchored) with a button that prepends 50 older messages. The Playwright
 * test locates an anchor row by data-message-id and asserts its boundingBox().y
 * is unchanged across the prepend.
 */
import { createRoot } from 'react-dom/client';
import { useRef, useState } from 'react';
import { Thread } from './src/shell/chat/Thread';
import type { ChatMessage } from './src/shell/chat/threadStore';
import './src/index.css';

function makeMessages(ids: number[]): ChatMessage[] {
  return ids.map((id) => ({
    id: String(id),
    role: (id % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
    text: `Message ${id} — ${'x'.repeat(40)}`,
    sessionId: 'harness',
  }));
}

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => makeMessages(Array.from({ length: 200 }, (_, i) => i)));
  const nextId = useRef(-1);

  const prepend = () => {
    const older = makeMessages(Array.from({ length: 50 }, () => nextId.current--));
    setMessages((prev) => [...older, ...prev]);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <button id="prepend" type="button" onClick={prepend}>Prepend 50</button>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Thread messages={messages} />
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);