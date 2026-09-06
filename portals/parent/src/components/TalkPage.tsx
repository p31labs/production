import { useState, useEffect, useRef } from 'react';
import {
  crisisCheck,
  remember,
  recall,
  listMemories,
  taskBreakdown,
  timeEstimate,
  grounding54321,
  meltdownPlan,
  simplify,
} from '@p31/ui';
import { getOpenAIFunctionDefinitions } from '../lib/registerTools';

const CHAT_API = 'https://portal-chat.trimtab-signal.workers.dev/chat';
const CHAT_RESULT_API = 'https://portal-chat.trimtab-signal.workers.dev/chat/result';
const CHAT_TIMEOUT_MS = 12000;

interface TalkPageProps {
  active: boolean;
  userName: string;
  spoons: number;
}

interface Message {
  id: number;
  text: string;
  sender: 'companion' | 'user';
  kind?: 'normal' | 'tool' | 'crisis' | 'memory';
  pending?: boolean;
}

interface ToolChip {
  key: string;
  label: string;
  emoji: string;
  onPick: () => void;
}

function formatMemoryDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

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
    return "I hear you. Something went wrong — try again?";
  }

  const data = await res.json() as { content?: string; tool_calls?: any[] };
  if (data.tool_calls && data.tool_calls.length && round < 3) {
    return executeToolLoop(turnId, data.tool_calls, round + 1);
  }
  return data.content ?? "I hear you. Tell me more — I'm here to help shape this.";
}

const chipStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: '999px',
  border: '1px solid var(--p31-glass-border, rgba(255,255,255,0.16))',
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--site-text-dim, #9ca3af)',
  fontSize: '12px',
  fontFamily: 'var(--p31-font-sans)',
  cursor: 'pointer',
};

export default function TalkPage({ active, userName, spoons }: TalkPageProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const raw = localStorage.getItem('p31-chat-history');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed as Message[];
      }
    } catch {
      /* ignore */
    }
    return [
      { id: 1, text: `🌱 Hi, I'm PHOS. I'm your cognitive companion.`, sender: 'companion' },
      { id: 2, text: 'I remember what we talk about, and I can shape thoughts — break tasks down, estimate energy, or draft replies.', sender: 'companion', kind: 'memory' },
    ];
  });
  const [input, setInput] = useState('');
  const [toolPanel, setToolPanel] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem('p31-chat-history', JSON.stringify(messages.slice(-100)));
    } catch {
      /* ignore */
    }
  }, [messages]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, toolPanel]);

  const push = (m: Message) => setMessages((prev) => [...prev, m]);

  const companionReply = (text: string) => {
    const check = crisisCheck(text);
    if (!check.safeToContinue) {
      push({ id: Date.now() + 1, text: `${check.suggestion} Let's ground together.`, sender: 'companion', kind: 'crisis' });
      setToolPanel('grounding');
      return;
    }
    const recallHit = recall(text);
    let reply = "I hear you. Tell me more — I'm here to help shape this.";
    if (recallHit.matches.length && Math.random() < 0.6) {
      const hit = recallHit.matches[0];
      reply = `That connects to what you said on ${formatMemoryDate(hit.created)}: "${hit.text.length > 60 ? hit.text.slice(0, 60) + '…' : hit.text}". ${reply}`;
      push({ id: Date.now() + 1, text: reply, sender: 'companion', kind: 'memory' });
      return;
    }
    if (listMemories().length === 0) remember(text, ['chat']);
    push({ id: Date.now() + 1, text: reply, sender: 'companion' });
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || pendingRef.current) return;
    pendingRef.current = true;
    const userMsg: Message = { id: Date.now(), text, sender: 'user' };
    const pendingMsg: Message = { id: Date.now() + 1, text: '🌿 PHOS is thinking…', sender: 'companion', pending: true };
    setMessages((prev) => [...prev, userMsg, pendingMsg]);
    setInput('');
    remember(text, ['chat']);

    const history = messages
      .filter((m) => !m.pending)
      .slice(-10)
      .map((m) => ({ role: m.sender === 'user' ? 'user' as const : 'assistant' as const, content: m.text }));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

    try {
      const functions = getOpenAIFunctionDefinitions('parent');
      const res = await fetch(CHAT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          portal: 'parent',
          message: text,
          context: { userName, spoons },
          history,
          functions,
        }),
      });

      const data = await res.json() as { content?: string; tool_calls?: any[]; turn_id?: string };

      if (data.tool_calls && data.tool_calls.length) {
        setMessages((prev) => {
          const rest = prev.filter((m) => m.id !== pendingMsg.id);
          return [...rest, { id: Date.now() + 2, text: '🔧 PHOS is using some tools to help…', sender: 'companion', kind: 'tool', pending: true }];
        });

        try {
          const finalContent = await executeToolLoop(data.turn_id!, data.tool_calls);
          setMessages((prev) => {
            const withoutPending = prev.filter((m) => !m.pending);
            return [...withoutPending, { id: Date.now() + 3, text: finalContent, sender: 'companion' }];
          });
        } catch {
          setMessages((prev) => prev.filter((m) => !m.pending));
          companionReply(text);
        }
      } else {
        setMessages((prev) => {
          const rest = prev.filter((m) => m.id !== pendingMsg.id);
          return [...rest, { id: Date.now() + 2, text: data.content || "I hear you. Tell me more — I'm here to help shape this.", sender: 'companion' }];
        });
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== pendingMsg.id));
      companionReply(text);
    } finally {
      clearTimeout(timer);
      pendingRef.current = false;
    }
  };

  const lastUserText = () => input || messages.filter((m) => m.sender === 'user').at(-1)?.text || 'this';

  const toolChips: ToolChip[] = [
    {
      key: 'breakdown',
      label: 'Break it down',
      emoji: '🧩',
      onPick: () => {
        const goal = lastUserText().replace(/^(break down|breakdown)\s*/i, '');
        const out = taskBreakdown(goal, 5);
        setToolPanel('breakdown');
        push({
          id: Date.now() + 1,
          text: `Steps for "${goal}":\n${out.subtasks.map((s) => `${s.order}. ${s.title}`).join('\n')}`,
          sender: 'companion',
          kind: 'tool',
        });
      },
    },
    {
      key: 'estimate',
      label: 'Time check',
      emoji: '⏱️',
      onPick: () => {
        const out = timeEstimate(lastUserText(), 'medium', spoons);
        setToolPanel('estimate');
        push({ id: Date.now() + 1, text: `${out.estimate_human} — ${out.note}`, sender: 'companion', kind: 'tool' });
      },
    },
    {
      key: 'grounding',
      label: 'Grounding',
      emoji: '🧘',
      onPick: () => {
        const g = grounding54321();
        setToolPanel('grounding');
        push({ id: Date.now() + 1, text: g.steps.join(' · '), sender: 'companion', kind: 'tool' });
      },
    },
    {
      key: 'meltdown',
      label: 'My plan',
      emoji: '🛡️',
      onPick: () => {
        const p = meltdownPlan(listMemories().map((m) => m.text).slice(-3), []);
        setToolPanel('meltdown');
        push({
          id: Date.now() + 1,
          text: `Your plan:\n${p.plan.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
          sender: 'companion',
          kind: 'tool',
        });
      },
    },
    {
      key: 'simplify',
      label: 'Make simpler',
      emoji: '✂️',
      onPick: () => {
        const out = simplify(lastUserText());
        setToolPanel('simplify');
        push({ id: Date.now() + 1, text: out.simplified, sender: 'companion', kind: 'tool' });
      },
    },
    {
      key: 'memories',
      label: 'What I remember',
      emoji: '💾',
      onPick: () => {
        const all = listMemories();
        setToolPanel('memories');
        push({
          id: Date.now() + 1,
          text: all.length
            ? `I remember ${all.length} things. Latest:\n${all.slice(-3).map((m) => `• ${m.text} (${formatMemoryDate(m.created)})`).join('\n')}`
            : "I don't have saved memories yet. Tell me something and I'll remember it.",
          sender: 'companion',
          kind: 'memory',
        });
      },
    },
  ];

  return (
    <div className={`page${active ? ' active' : ''}`} id="page-talk" role="tabpanel">
      <div className="bento-grid">
        <div className="card col-span-full">
          <div className="card-header">💬 Talk — Cognitive Companion</div>
          <p style={{ color: 'var(--site-text-dim)', fontSize: '0.8rem', margin: '0 0 var(--p31-space-md)' }}>
            Listens, remembers, and helps shape thoughts — break tasks down, estimate energy, or draft replies.
          </p>

          <div
            ref={containerRef}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--p31-space-sm)',
              minHeight: '260px',
              maxHeight: '45vh',
              overflowY: 'auto',
              padding: 'var(--p31-space-md)',
              border: '1px solid var(--p31-glass-border, rgba(255,255,255,0.12))',
              borderRadius: 'var(--p31-radius-md, 14px)',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  padding: '10px 14px',
                  borderRadius: msg.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  background:
                    msg.sender === 'user'
                      ? 'var(--p31-accent, #00F0FF)'
                      : msg.kind === 'crisis'
                      ? 'rgba(248,113,113,0.18)'
                      : msg.kind === 'memory'
                      ? 'rgba(167,139,250,0.16)'
                      : 'rgba(255,255,255,0.07)',
                  color: msg.sender === 'user' ? '#021418' : 'var(--site-text, #e5e7eb)',
                  fontSize: '14px',
                  fontFamily: 'var(--p31-font-sans)',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.text}
              </div>
            ))}
            {toolPanel && (
              <div style={{ alignSelf: 'flex-start', fontSize: '12px', color: 'var(--site-text-dim, #9ca3af)' }}>
                tool applied above — keep talking or pick another
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 'var(--p31-space-xs, 8px)', flexWrap: 'wrap', padding: 'var(--p31-space-md) 0' }}>
            {toolChips.map((c) => (
              <button key={c.key} style={chipStyle} onClick={c.onPick}>
                {c.emoji} {c.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            style={{ display: 'flex', gap: 'var(--p31-space-sm)', paddingTop: 'var(--p31-space-sm)' }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              aria-label="Chat message"
              style={{
                flex: 1,
                padding: 'var(--p31-space-md)',
                border: '1px solid var(--p31-glass-border, rgba(255,255,255,0.16))',
                borderRadius: '999px',
                fontSize: '14px',
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--site-text, #e5e7eb)',
                minHeight: '44px',
                fontFamily: 'var(--p31-font-sans)',
              }}
            />
            <button
              type="submit"
              style={{
                minHeight: '44px',
                padding: '0 var(--p31-space-lg)',
                borderRadius: '999px',
                background: 'var(--p31-accent, #00F0FF)',
                color: '#021418',
                border: 'none',
                fontSize: '14px',
                fontFamily: 'var(--p31-font-sans)',
                cursor: 'pointer',
              }}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
