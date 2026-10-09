import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useSandboxStore } from './sandboxStore';
import ChatSidebar from './ChatSidebar';
import ChatMessage from './ChatMessage';
import AgentSelector from './AgentSelector';
import { localChat } from '../../lib/localLlm';
import { subscribeToolCalls } from '../../lib/mcpRegistry';
import type { ToolCallEvent } from '../../lib/mcpRegistry';
import type { Message, AgentId } from './sandboxStore';
import { useAppStore } from '../../store/useAppStore';
import { useDualEconomyStore } from '../economy';
import { evaluateSend } from '../../lib/cognitiveGate';
import CognitiveShieldSuggestion from '../../components/CognitiveShieldSuggestion';
import type { MessageAnalysis, ShieldedMessage } from '@p31ca/rules';
import { remoteGenerate, gatewayGenerate, currentThemeTokens, type ThemeTokens } from './remote';
import { loadIdentity } from '@p31ca/shared-identity';

// ── Embedding cache ──────────────────────────────────────────────────────────
// Cache embeddings by content hash to avoid recomputation.
const embeddingCache = new Map<string, number[]>();
// Track which message ids have already been batch-stored to avoid duplicates.
const batchStoredIds = new Set<string>();

function hashContent(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return `emb_${h}`;
}

async function storeEmbedding(text: string): Promise<void> {
  const key = hashContent(text);
  if (embeddingCache.has(key)) return;

  const { computeEmbeddingSafe } = await import('../../lib/embeddingService');
  const { storeMessageEmbedding } = await import('../../lib/cognitiveGate');

  const embedding = await computeEmbeddingSafe(text);
  if (embedding) {
    embeddingCache.set(key, embedding);
    storeMessageEmbedding(text, embedding).catch(() => {});
  }
}

async function storeBatchEmbeddingsForMessages(msgs: Message[]): Promise<void> {
  if (msgs.length === 0) return;
  const { computeBatchEmbeddings } = await import('../../lib/embeddingService');
  const { storeBatchEmbeddings } = await import('../../lib/db');

  const texts = msgs.map(m => m.content);
  const embeddings = await computeBatchEmbeddings(texts);
  const items = msgs.map((m, i) => ({ id: hashContent(m.content), content: m.content, embedding: embeddings[i] }));
  await storeBatchEmbeddings(items);
  items.forEach(item => embeddingCache.set(item.id, item.embedding));
  items.forEach(item => batchStoredIds.add(item.id));
}

const SUGGESTION_CHIPS = [
  'Build a calming dashboard with a spoon meter',
  'Create a login form with validation',
  'Design a hero section with a CTA',
  'Make a card grid with glass borders',
  'Generate a profile page layout',
];

function generateAssistantResponse(
  prompt: string,
  agent: AgentId,
  tokens: ThemeTokens,
  onChunk: (chunk: string) => void,
  onDone: (fullText: string) => void,
  onError: (err: string) => void,
): () => void {
  let cancelled = false;

  // Lane B: Try gateway /v1/chat/completions with JWT first (preferred path).
  // Falls back to localChat if identity is unavailable or gateway fails.
  const identity = loadIdentity();

  if (identity) {
    gatewayGenerate(prompt + ` (Use theme: bg="${tokens.bg}", text="${tokens.text}", accent="${tokens.accent}", system-ui font, max 200 lines of HTML with embedded CSS.)`, identity, onChunk, onError, (html) => {
      if (cancelled) return;
      let cleaned = html.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```html?\s*\n?/i, '').replace(/\n?```\s*$/, '');
      }
      onDone(cleaned);
    })
      .then((success) => {
        if (cancelled) return;
        if (!success) {
          // Gateway failed — fall back to local
          fallbackToLocal(prompt, tokens, onChunk, onDone, onError);
        }
      })
      .catch(() => { if (!cancelled) fallbackToLocal(prompt, tokens, onChunk, onDone, onError); });
  } else {
    fallbackToLocal(prompt, tokens, onChunk, onDone, onError);
  }

  function fallbackToLocal(prompt: string, tokens: ThemeTokens, onChunk: (chunk: string) => void, onDone: (fullText: string) => void, onError: (err: string) => void) {
    const systemPrompt = `You are the ${agent} agent in the P31 Sovereign Shell. You generate HTML UI components.
Rules:
- Output ONLY valid HTML. No markdown wrapping, no code fences, no explanations.
- Use embedded CSS inside <style> tags, not external files.
- Color scheme must match the current P31 theme exactly: background ${tokens.bg}, text ${tokens.text}, accent ${tokens.accent}.
- Use system-ui font.
- Keep the output under 200 lines.
- The user prompt describes what to build. Generate it directly.`;

    localChat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ])
      .then((result) => {
        if (cancelled) return;
        if (!result) { onError('No response from local model'); return; }
        let html = result.trim();
        if (html.startsWith('```')) {
          html = html.replace(/^```html?\s*\n?/i, '').replace(/\n?```\s*$/, '');
        }
        const CHUNK = 32;
        const INTERVAL = 28;
        let i = 0;
        const timer = setInterval(() => {
          if (cancelled) { clearInterval(timer); return; }
          onChunk(html.slice(i, i + CHUNK));
          i += CHUNK;
          if (i >= html.length) {
            clearInterval(timer);
            onDone(html);
          }
        }, INTERVAL);
      })
      .catch((e) => { if (!cancelled) onError(String(e)); });
  }

  return () => { cancelled = true; };
}

export default function SandboxChat({ onArtifactGenerated }: { onArtifactGenerated: (title: string, code: string) => void }) {
  const messages = useSandboxStore((s) => {
    const tid = s.activeThreadId;
    return tid ? (s.messages[tid] || []) : [];
  });
  const activeThreadId = useSandboxStore((s) => s.activeThreadId);
  const activeAgent = useSandboxStore((s) => s.activeAgent);
  const isStreaming = useSandboxStore((s) => s.isStreaming);
  const streamingText = useSandboxStore((s) => s.streamingText);
  const generationStatus = useSandboxStore((s) => s.generationStatus);
  const sidebarCollapsed = useSandboxStore((s) => s.sidebarCollapsed);
  const addMessage = useSandboxStore((s) => s.addMessage);
  const setStreaming = useSandboxStore((s) => s.setStreaming);
  const setIsStreaming = useSandboxStore((s) => s.setIsStreaming);
  const appendStreamingText = useSandboxStore((s) => s.appendStreamingText);
  const setGenerationStatus = useSandboxStore((s) => s.setGenerationStatus);
  const setLastPrompt = useSandboxStore((s) => s.setLastPrompt);
  const setActiveAgent = useSandboxStore((s) => s.setActiveAgent);
  const createThread = useSandboxStore((s) => s.createThread);

  const [input, setInput] = useState('');
  const [pendingSuggestion, setPendingSuggestion] = useState<{ analysis: MessageAnalysis; shield: ShieldedMessage } | null>(null);
  const [suggestionChip, setSuggestionChip] = useState<{ selector: string; html: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const queueRef = useRef<{ prompt: string; agent: AgentId }[]>([]);
  const processingRef = useRef(false);

  const generating = generationStatus !== 'idle';

  // ensure we have an active thread
  useEffect(() => {
    if (!activeThreadId) createThread();
  }, [activeThreadId, createThread]);

  // auto-scroll when messages change or streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // auto-resize composer textarea to fit content, capped at max-height
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd } = el;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 240) + 'px';
    el.setSelectionRange(selectionStart, selectionEnd);
  }, [input]);

  // subscribe to tool call events and inject into message stream
  useEffect(() => {
    const unsub = subscribeToolCalls((event: ToolCallEvent) => {
      const tid = useSandboxStore.getState().activeThreadId;
      if (!tid) return;
      const msgs = useSandboxStore.getState().messages[tid] || [];
      const last = msgs[msgs.length - 1];
      if (last && last.role === 'assistant') {
        const existing = last.toolCalls || [];
        const idx = existing.findIndex((tc) => tc.id === event.id);
        if (idx >= 0) {
          existing[idx] = event;
        } else {
          existing.push(event);
        }
        useSandboxStore.setState((s) => ({
          messages: { ...s.messages, [tid]: msgs.map((m, i) => (i === msgs.length - 1 ? { ...m, toolCalls: [...existing] } : m)) },
        }));
      }
    });
    return unsub;
  }, []);

  // listen for click-to-edit messages from the artifact preview iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'element-click') {
        const { selector, html } = event.data;
        setSuggestionChip({ selector, html });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // listen for element selection from the inspector tab
  useEffect(() => {
    const onElementClick = (e: Event) => {
      const detail = (e as CustomEvent<{ selector?: string }>).detail;
      if (detail?.selector) setSuggestionChip({ selector: detail.selector, html: '' });
    };
    window.addEventListener('p31:element-click', onElementClick);
    return () => window.removeEventListener('p31:element-click', onElementClick);
  }, []);

  // global keyboard shortcuts: Ctrl+Enter to send, Escape to stop/dismiss
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      } else if (e.key === 'Escape') {
        if (generating) handleStop();
        else setSuggestionChip(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [generating, input, streamingText]);

  // lazy batch-embed message history when the model is ready (background)
  useEffect(() => {
    const unembedded = messages.filter(m => !batchStoredIds.has(m.id) && m.content.trim().length > 0);
    if (unembedded.length === 0) return;
    let cancelled = false;
    storeBatchEmbeddingsForMessages(unembedded).then(() => {
      if (!cancelled) unembedded.forEach(m => batchStoredIds.add(m.id));
    }).catch(() => { /* graceful: single-store fallback covers new messages */ });
    return () => { cancelled = true; };
  }, [messages]);

  const handleChipClick = (selector: string) => {
    const html = suggestionChip?.html?.trim();
    setSuggestionChip(null);
    enqueue(html
      ? `Update the element matching "${selector}" to be more polished.\n\nCurrent markup:\n${html.slice(0, 2000)}`
      : `Update the element matching "${selector}" to be more polished.`);
  };

  const processJob = useCallback((prompt: string, agent: AgentId): Promise<void> => {
    return new Promise<void>((resolve) => {
      const finish = () => { setIsStreaming(false); setStreaming(null); };
      const tokens = currentThemeTokens();
      setLastPrompt(prompt);
      setStreaming(null);
      setIsStreaming(true);
      setGenerationStatus('pending');

      remoteGenerate(prompt, tokens)
        .then((result) => {
          if (result?.html) {
            setGenerationStatus('done');
            addMessage('assistant', 'Generated successfully!');
            onArtifactGenerated(prompt.slice(0, 40), result.html);
            finish(); resolve();
            return;
          }
          if (result?.url) {
            setGenerationStatus('done');
            addMessage('assistant', `Deployed to ${result.url}`);
            finish(); resolve();
            return;
          }

          setGenerationStatus('streaming');
          setStreaming('');
          cancelRef.current = generateAssistantResponse(
            prompt,
            agent,
            tokens,
            (chunk) => appendStreamingText(chunk),
            (html) => {
              setGenerationStatus('done');
              addMessage('assistant', 'Here\'s what I built:');
              onArtifactGenerated(prompt.slice(0, 40), html);
              finish(); resolve();
            },
            (err) => {
              setGenerationStatus('error');
              addMessage('assistant', `Error: ${err}`);
              finish(); resolve();
            },
          );
        })
        .catch(() => {
          setGenerationStatus('error');
          addMessage('assistant', 'Generation failed. Please try again.');
          finish(); resolve();
        });
    });
  }, [onArtifactGenerated, addMessage, appendStreamingText, setStreaming, setIsStreaming, setGenerationStatus, setLastPrompt]);

  const pumpQueue = useCallback(async () => {
    if (processingRef.current) return;
    const job = queueRef.current.shift();
    if (!job) { setGenerationStatus('idle'); return; }
    processingRef.current = true;
    try {
      await processJob(job.prompt, job.agent);
    } finally {
      processingRef.current = false;
      await pumpQueue();
    }
  }, [processJob, setGenerationStatus]);

  const enqueue = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    queueRef.current.push({ prompt: trimmed, agent: useSandboxStore.getState().activeAgent });
    void pumpQueue();
  }, [pumpQueue]);

  // manual retry from the sandbox:generate command
  useEffect(() => {
    const onRetry = () => {
      const last = useSandboxStore.getState().lastPrompt;
      if (last) enqueue(last);
    };
    window.addEventListener('p31:sandbox-retry', onRetry);
    return () => window.removeEventListener('p31:sandbox-retry', onRetry);
  }, [enqueue]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    const economy = useDualEconomyStore.getState();
    const userId = useAppStore.getState().did || 'SYSTEM';
    const gate = await evaluateSend({
      text,
      userId,
      zoneId: 'commons',
      spoonBalance: economy.budget.remaining,
      karma: economy.lifetimeKarma,
    });

    if (!gate.allowed) {
      useAppStore.getState().showToast(gate.deniedBy?.action.message || 'Stand Down active. Rest first.', 'error');
      return;
    }

    if (gate.shouldShield && gate.shield?.rewritten) {
      setPendingSuggestion({ analysis: gate.analysis, shield: gate.shield });
      return;
    }

    setInput('');
    enqueue(text);
    storeEmbedding(text).catch(() => {});
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStop = () => {
    cancelRef.current?.();
    cancelRef.current = null;
    queueRef.current = [];
    setIsStreaming(false);
    setGenerationStatus('idle');
    if (streamingText) {
      addMessage('assistant', streamingText);
      setStreaming(null);
    }
  };

  const streamingMessage: Message | null = isStreaming && streamingText != null
    ? { id: 'streaming', role: 'assistant', content: streamingText, timestamp: Date.now() }
    : null;

  const allMessages: Message[] = streamingMessage ? [...messages, streamingMessage] : messages;

  return (
    <>
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {!sidebarCollapsed && <ChatSidebar />}
      <div className={`chat-pane${allMessages.length === 0 && !isStreaming ? ' chat-pane--empty' : ''}`}>
        {allMessages.length === 0 && !isStreaming ? (
          <div className="chat-empty-prompt">
            <h3>What do you want to build?</h3>
            <p>Describe a UI component and I'll generate it live.</p>
            <div className="chat-empty-chips">
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="chat-empty-chip"
                  onClick={() => { setInput(chip); textareaRef.current?.focus(); }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="chat-messages">
            {allMessages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isStreaming={msg.id === 'streaming'}
              />
            ))}
            {generating && !streamingMessage && (
              <div className="chat-msg chat-msg--assistant">
                <div className="chat-msg-bubble">
                  <span style={{ color: 'var(--p31-text-tertiary)', fontStyle: 'italic' }}>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        <div className="chat-composer" role="form" aria-label="Chat composer">
          {(generationStatus === 'pending' || generationStatus === 'streaming') && (
            <div className="chat-generation-status">
              <span className="status-dot" aria-hidden="true" />
              {generationStatus === 'pending' ? 'Calling generator…' : 'Streaming…'}
            </div>
          )}
          {suggestionChip && (
            <div className="suggestion-chip" onClick={() => handleChipClick(suggestionChip.selector)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleChipClick(suggestionChip.selector); } }}>
              <span>{'\u270F\uFE0F'} Edit element: <code>{suggestionChip.selector}</code></span>
               <button className="suggestion-chip-dismiss" onClick={(e) => { e.stopPropagation(); setSuggestionChip(null); }} aria-label="Dismiss suggestion">{'\u00D7'}</button>
            </div>
          )}
          <div className="chat-composer-pill">
            <textarea
              ref={textareaRef}
              className="chat-composer-input"
              placeholder="Describe the UI you want to build..."
              aria-label="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={generating}
            />
            <div className="composer-toolbar">
              <div className="composer-agent-select">
                <AgentSelector
                  className="composer-agent-selector"
                  active={activeAgent}
                  onChange={setActiveAgent}
                />
              </div>
              {generating ? (
                <button type="button" className="btn ghost chat-composer-stop" onClick={handleStop}>
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  className="btn primary chat-composer-send"
                  onClick={handleSend}
                  disabled={!input.trim()}
                  aria-label="Send message"
                >
                  Send
                </button>
              )}
            </div>
          </div>
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {isStreaming && `Generating: ${streamingText}`}
          </div>
        </div>
      </div>
      </div>
      {pendingSuggestion && (
        <CognitiveShieldSuggestion
          analysis={pendingSuggestion.analysis}
          shield={pendingSuggestion.shield}
          onAccept={(rewritten) => {
            setPendingSuggestion(null);
            setInput('');
            enqueue(rewritten);
          }}
          onKeepOriginal={() => {
            setPendingSuggestion(null);
            setInput('');
            enqueue(pendingSuggestion.analysis.originalText);
          }}
          onClose={() => setPendingSuggestion(null)}
        />
      )}
    </>
  );
}
