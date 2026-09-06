import { useState, useEffect, useRef } from 'react';
import QuickChatButton from './QuickChatButton';
import { CHAT_RESPONSES, DEFAULT_CHAT_RESPONSE } from '../lib/constants';
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
    return "I'm here with you. Something went wrong — try again? ✨";
  }

  const data = await res.json() as { content?: string; tool_calls?: any[] };
  if (data.tool_calls && data.tool_calls.length && round < 3) {
    return executeToolLoop(turnId, data.tool_calls, round + 1);
  }
  return data.content ?? "I'm here with you. Try again in a moment! ✨";
}

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
      { id: 1, text: `🌱 Hi, I'm Willow. How are you doing today?`, sender: 'companion' },
      { id: 2, text: "I remember things you tell me, so we can pick up where we left off.", sender: 'companion', kind: 'memory' },
    ];
  });
  const [input, setInput] = useState('');
  const [toolPanel, setToolPanel] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const memos = listMemories();
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
      push({ id: Date.now() + 1, text: `${check.suggestion} Let's slow down together. Try the 5-4-3-2-1 grounding below.`, sender: 'companion', kind: 'crisis' });
      setToolPanel('grounding');
      return;
    }
    const recallHit = recall(text);
    const memories = listMemories().slice(-5);
    let reply = CHAT_RESPONSES[text.toLowerCase()] || DEFAULT_CHAT_RESPONSE;
    if (recallHit.matches.length && Math.random() < 0.6) {
      const hit = recallHit.matches[0];
      reply = `That reminds me — on ${formatMemoryDate(hit.created)} you said "${hit.text.length > 60 ? hit.text.slice(0, 60) + '…' : hit.text}". ${reply}`;
      push({ id: Date.now() + 1, text: reply, sender: 'companion', kind: 'memory' });
      return;
    }
    if (memories.length === 0) {
      remember(text, ['chat']);
    }
    push({ id: Date.now() + 1, text: reply, sender: 'companion' });
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || pendingRef.current) return;
    pendingRef.current = true;
    const userMsg: Message = { id: Date.now(), text, sender: 'user' };
    const pendingMsg: Message = { id: Date.now() + 1, text: '🌱 Willow is thinking…', sender: 'companion', pending: true };
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
      const functions = getOpenAIFunctionDefinitions('children');
      const res = await fetch(CHAT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          portal: 'children',
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
          return [...rest, { id: Date.now() + 2, text: '🔧 Willow is using some tools to help…', sender: 'companion', kind: 'tool', pending: true }];
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
          return [...rest, { id: Date.now() + 2, text: data.content || '🌱 I hear you. Tell me more.', sender: 'companion' }];
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const toolChips: ToolChip[] = [
    {
      key: 'breakdown',
      label: 'Break it down',
      emoji: '🧩',
      onPick: () => {
        const goal = (input || messages.filter((m) => m.sender === 'user').at(-1)?.text || 'my thing').replace(/^(break down|breakdown)\s*/i, '');
        const out = taskBreakdown(goal, 5);
        setToolPanel('breakdown');
        push({
          id: Date.now() + 1,
          text: `Here's ${goal} split into steps:\n${out.subtasks.map((s) => `${s.order}. ${s.title}`).join('\n')}`,
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
        const task = (input || 'this') as string;
        const out = timeEstimate(task, 'medium', spoons);
        setToolPanel('estimate');
        push({
          id: Date.now() + 1,
          text: `${out.estimate_human} for "${task}". ${out.note}`,
          sender: 'companion',
          kind: 'tool',
        });
      },
    },
    {
      key: 'grounding',
      label: 'Grounding',
      emoji: '🧘',
      onPick: () => {
        const g = grounding54321();
        setToolPanel('grounding');
        push({
          id: Date.now() + 1,
          text: g.steps.join(' · '),
          sender: 'companion',
          kind: 'tool',
        });
      },
    },
    {
      key: 'meltdown',
      label: 'My plan',
      emoji: '🛡️',
      onPick: () => {
        const p = meltdownPlan(memos.map((m) => m.text).slice(-3), []);
        setToolPanel('meltdown');
        push({
          id: Date.now() + 1,
          text: `Your meltdown plan:\n${p.plan.map((s, i) => `${i + 1}. ${s}`).join('\n')}\nTriggers logged: ${p.triggers.join(', ')}`,
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
        const text = (input || messages.filter((m) => m.sender === 'user').at(-1)?.text || '') as string;
        const out = simplify(text);
        setToolPanel('simplify');
        push({
          id: Date.now() + 1,
          text: out.simplified,
          sender: 'companion',
          kind: 'tool',
        });
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
            : "I don't have any saved memories yet. Tell me something and I'll remember it.",
          sender: 'companion',
          kind: 'memory',
        });
      },
    },
  ];

  const toolPanelBody = toolPanel ? toolChips.find((c) => c.key === toolPanel) : null;

  return (
    <section className={`page${active ? ' active' : ''}`} id="page-talk" role="tabpanel">
      <h2>💬 Talk</h2>
      <p className="subtitle">I'm here to listen — and I remember</p>

      <div className="companion-card" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
        <div className="chat-container" ref={containerRef}>
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-bubble ${msg.sender}${msg.kind ? ` kind-${msg.kind}` : ''}${msg.pending ? ' pending' : ''}`}>
              {msg.text.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          ))}
          {toolPanelBody && (
            <div className="tool-hint" style={{ marginTop: 'var(--p31-space-sm)', fontSize: 'var(--p31-type-caption)', color: 'var(--p31-text-secondary)' }}>
              {toolPanelBody.emoji} {toolPanelBody.label} — tool result above. You can keep talking or ask for another.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 'var(--p31-space-xs)', flexWrap: 'wrap', paddingBottom: 'var(--p31-space-sm)' }}>
          {toolChips.map((c) => (
            <button
              key={c.key}
              className="chip"
              onClick={c.onPick}
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
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 'var(--p31-space-sm)', marginTop: 'auto', paddingTop: 'var(--p31-space-md)' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
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

      <div style={{ marginTop: 'var(--p31-space-md)', display: 'flex', gap: 'var(--p31-space-sm)', flexWrap: 'wrap', justifyContent: 'center' }}>
        <QuickChatButton message="I'm feeling sad" emoji="😢" onClick={sendMessage} />
        <QuickChatButton message="I'm worried about school" emoji="📚" onClick={sendMessage} />
        <QuickChatButton message="I need help calming down" emoji="🌿" onClick={sendMessage} />
      </div>
    </section>
  );
}
