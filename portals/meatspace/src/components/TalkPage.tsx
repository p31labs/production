import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getOpenAIFunctionDefinitions } from '../lib/registerTools';

const CHAT_API = 'https://portal-chat.trimtab-signal.workers.dev/chat';
const CHAT_RESULT_API = 'https://portal-chat.trimtab-signal.workers.dev/chat/result';
const CHAT_TIMEOUT_MS = 12000;

const QUICK_PROMPTS: Array<{ label: string; emoji: string; message: string }> = [
  { label: 'Activity idea', emoji: '🎲', message: 'Suggest a fun activity for us to do together' },
  { label: 'We need a hug', emoji: '🫂', message: 'We all feel a bit low today. What can we do to bond?' },
  { label: 'Conversation starter', emoji: '💬', message: 'Give us a family conversation starter' },
  { label: 'Low spoons', emoji: '🌙', message: 'We are all low on spoons. Suggest a very gentle connection activity' },
];

async function executeToolLoop(
  turnId: string,
  toolCalls: any[],
  round = 1,
): Promise<string> {
  const toolResults = await Promise.all(
    toolCalls.map(async (tc: any) => {
      try {
        const exec = (window as any).__p31MCPExec;
        const args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
        const result = exec ? await exec(tc.function.name, args) : { error: 'Tool executor unavailable' };
        return { tool_call_id: tc.id, result };
      } catch (e) {
        return { tool_call_id: tc.id, result: { error: e instanceof Error ? e.message : 'Tool failed' } };
      }
    }),
  );

  const res = await fetch(CHAT_RESULT_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ turn_id: turnId, tool_results: toolResults }),
  });

  if (!res.ok) {
    return "🌿 I'm here with you. Something went wrong — try again?";
  }

  const data = await res.json() as { content?: string; tool_calls?: any[] };
  if (data.tool_calls && data.tool_calls.length && round < 3) {
    return executeToolLoop(turnId, data.tool_calls, round + 1);
  }
  return data.content ?? "🌿 I'm here with you. Tell me more.";
}

interface Message {
  id: number;
  text: string;
  sender: 'companion' | 'user';
  pending?: boolean;
}

interface TalkPageProps {
  active: boolean;
}

export default function TalkPage({ active }: TalkPageProps) {
  const userName = useAppStore((s) => s.profile?.name);
  const spoons = useAppStore((s) => s.spoons);

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const raw = localStorage.getItem('p31-meatspace-chat-history');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed as Message[];
      }
    } catch {
      /* ignore */
    }
    return [
      { id: 1, text: `🌿 Hi! I'm Bonding Buddy. Let's find a way to connect today.`, sender: 'companion' },
    ];
  });
  const [input, setInput] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem('p31-meatspace-chat-history', JSON.stringify(messages.slice(-100)));
    } catch {
      /* ignore */
    }
  }, [messages]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const push = (m: Message) => setMessages((prev) => [...prev, m]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || pendingRef.current) return;
    pendingRef.current = true;
    const userMsg: Message = { id: Date.now(), text, sender: 'user' };
    const pendingMsg: Message = { id: Date.now() + 1, text: '🌿 Bonding Buddy is thinking…', sender: 'companion', pending: true };
    setMessages((prev) => [...prev, userMsg, pendingMsg]);
    setInput('');

    const history = messages
      .filter((m) => !m.pending)
      .slice(-10)
      .map((m) => ({ role: m.sender === 'user' ? 'user' as const : 'assistant' as const, content: m.text }));

    try {
      const functions = getOpenAIFunctionDefinitions('meatspace');
      const res = await fetch(CHAT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portal: 'meatspace',
          message: text,
          context: { spoons, userName: userName || null },
          history,
          functions,
        }),
      });
      const data = await res.json() as { content?: string; tool_calls?: any[]; turn_id?: string };

      if (data.tool_calls && data.tool_calls.length) {
        setMessages((prev) => {
          const rest = prev.filter((m) => m.id !== pendingMsg.id);
          return [...rest, { id: Date.now() + 2, text: '🔧 Bonding Buddy is thinking…', sender: 'companion', kind: 'tool', pending: true }];
        });

        try {
          const finalContent = await executeToolLoop(data.turn_id!, data.tool_calls);
          setMessages((prev) => {
            const withoutPending = prev.filter((m) => !m.pending);
            return [...withoutPending, { id: Date.now() + 3, text: finalContent, sender: 'companion' }];
          });
        } catch {
          setMessages((prev) => prev.filter((m) => !m.pending));
          setMessages((prev) => [...prev, { id: Date.now() + 3, text: "🌿 I'm here with you. Try again in a moment!", sender: 'companion' }]);
        }
      } else {
        setMessages((prev) => {
          const withoutPending = prev.filter((m) => m.id !== pendingMsg.id);
          return [...withoutPending, { id: Date.now() + 2, text: data.content || "🌿 I'm here with you. Tell me more.", sender: 'companion' }];
        });
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== pendingMsg.id));
      setMessages((prev) => [...prev, { id: Date.now() + 2, text: "🌿 I'm here with you. Try again in a moment!", sender: 'companion' }]);
    } finally {
      pendingRef.current = false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <section className={`page${active ? ' active' : ''}`} id="page-talk" role="tabpanel">
      <h2>💬 Talk</h2>
      <p className="subtitle">Bonding Buddy — together time ideas</p>

      <div className="companion-card" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
        <div className="chat-container" ref={containerRef}>
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-bubble ${msg.sender}${msg.pending ? ' pending' : ''}`}>
              {msg.text.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 'var(--p31-space-xs)', flexWrap: 'wrap', paddingBottom: 'var(--p31-space-sm)' }}>
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p.label}
              className="chip"
              onClick={() => sendMessage(p.message)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--p31-radius-full)',
                border: '1px solid var(--p31-glass-border)',
                background: 'rgba(255,255,255,0.35)',
                fontSize: 'var(--p31-type-caption)',
                fontFamily: 'var(--p31-font-sans)',
                cursor: 'pointer',
              }}
            >
              {p.emoji} {p.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 'var(--p31-space-sm)', marginTop: 'auto', paddingTop: 'var(--p31-space-md)' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What would you like to do together?"
            style={{
              flex: 1,
              padding: 'var(--p31-space-md)',
              border: '2px solid var(--p31-glass-border)',
              borderRadius: 'var(--p31-radius-full)',
              fontSize: 'var(--p31-type-body)',
              background: 'rgba(255,255,255,0.5)',
              minHeight: 'var(--p31-touch-min)',
              fontFamily: 'var(--p31-font-sans)',
            }}
            aria-label="Chat message"
          />
          <button type="submit" className="button" style={{ minWidth: 'var(--p31-touch-min)', minHeight: 'var(--p31-touch-min)', padding: '0 var(--p31-space-md)' }}>
            Send
          </button>
        </form>
      </div>
    </section>
  );
}
