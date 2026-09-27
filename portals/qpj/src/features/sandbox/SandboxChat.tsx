import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ReactNode } from 'react';
import { useSandboxStore } from './sandboxStore';
import ChatSidebar from './ChatSidebar';
import ChatMessage from './ChatMessage';
import AgentSelector from './AgentSelector';
import ClarifyGate from './ClarifyGate';
import ToolTimeline from './ToolTimeline';
import type { Message, AgentId } from './sandboxStore';
import { remoteGenerate, currentThemeTokens, remoteTitle, GENERATE_STREAM_URL, type ThemeTokens } from './remote';
import { localCompose } from './localCompose';
import { detectAmbiguities, resolveClarify } from './clarify';
import { validateHtml, runRubric, buildRepairPrompt, makeStep, repairLoop, type ContractIssue } from './pipeline';
import { captureAndDiff, visualDiffVerdictToIssue } from './visualDiff';
import { Button, GlassPanel } from '@p31ca/design-core/compositions';

const VIRTUAL_THRESHOLD = 50;

const PROMPT_CARDS = [
  {
    icon: 'chart',
    title: 'Dashboard',
    desc: 'Calming overview with a live spoon meter',
    prompt: 'Build a calming dashboard with a spoon meter',
  },
  {
    icon: 'form',
    title: 'Login form',
    desc: 'Email + password with inline validation',
    prompt: 'Create a login form with validation',
  },
  {
    icon: 'grid',
    title: 'Card grid',
    desc: 'Glass borders and hover lift',
    prompt: 'Make a card grid with glass borders',
  },
  {
    icon: 'gear',
    title: 'Settings page',
    desc: 'Profile, theme, and toggles layout',
    prompt: 'Generate a settings page layout',
  },
];

function maybeRefineTitle(): void {
  const store = useSandboxStore.getState();
  const tid = store.activeThreadId;
  if (!tid) return;
  const thread = store.threads.find((t) => t.id === tid);
  if (!thread) return;
  const msgs = store.messages[tid] ?? [];
  if (msgs.filter((m) => m.role === 'assistant').length !== 1) return;
  const firstUser = msgs.find((m) => m.role === 'user');
  if (!firstUser) return;
  void remoteTitle(firstUser.content, '').then((title) => {
    if (title) useSandboxStore.getState().renameThread(tid, title);
  });
}

function PromptIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    chart: (
      <>
        <rect x="3" y="12" width="4" height="9" rx="1" />
        <rect x="10" y="7" width="4" height="14" rx="1" />
        <rect x="17" y="3" width="4" height="18" rx="1" />
      </>
    ),
    form: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="3" />
        <path d="m9 12 3 3 4-4" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    gear: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] || null}
    </svg>
  );
}

function generateAssistantResponse(
  prompt: string,
  agent: AgentId,
  tokens: ThemeTokens,
  onChunk: (chunk: string) => void,
  onDone: (fullText: string) => void,
  onError: (err: string) => void,
): () => void {
  let cancelled = false;

  const sendToWorker = async () => {
    if (cancelled) return;
    if (!GENERATE_STREAM_URL) {
      onDone(localCompose(prompt, agent, tokens));
      return;
    }
    try {
      const response = await fetch(GENERATE_STREAM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${prompt}\n(Use theme: bg="${tokens.bg}", text="${tokens.text}", accent="${tokens.accent}", system-ui font, max 200 lines of HTML with embedded CSS.)`,
          agent,
          tokens,
        }),
      });

      if (!response.ok) {
        throw new Error(`Generate failed: ${response.status}`);
      }

      const data = await response.json();
      if (data.html) {
        if (cancelled) return;
        onDone(data.html);
      } else if (data.error) {
        onError(data.error);
      }
    } catch {
      if (cancelled) return;
      onDone(localCompose(prompt, agent, tokens));
    }
  };

  sendToWorker();

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
  const toggleSidebar = useSandboxStore((s) => s.toggleSidebar);
  const pipelineSteps = useSandboxStore((s) => s.pipelineSteps);
  const pendingClarify = useSandboxStore((s) => s.pendingClarify);
  const addMessage = useSandboxStore((s) => s.addMessage);
  const setStreaming = useSandboxStore((s) => s.setStreaming);
  const setIsStreaming = useSandboxStore((s) => s.setIsStreaming);
  const appendStreamingText = useSandboxStore((s) => s.appendStreamingText);
  const setGenerationStatus = useSandboxStore((s) => s.setGenerationStatus);
  const setLastPrompt = useSandboxStore((s) => s.setLastPrompt);
  const setActiveAgent = useSandboxStore((s) => s.setActiveAgent);
  const createThread = useSandboxStore((s) => s.createThread);
  const pushPipelineStep = useSandboxStore((s) => s.pushPipelineStep);
  const updatePipelineStep = useSandboxStore((s) => s.updatePipelineStep);
  const clearPipeline = useSandboxStore((s) => s.clearPipeline);
  const setPendingClarify = useSandboxStore((s) => s.setPendingClarify);

  const [input, setInput] = useState('');
  const [suggestionChip, setSuggestionChip] = useState<{ selector: string; html: string } | null>(null);
  const [drifted, setDrifted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    setDrifted(gap > 60);
  };

  useEffect(() => {
    if (!drifted) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, streamingText, drifted]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const queueRef = useRef<{ prompt: string; agent: AgentId; repair?: ContractIssue }[]>([]);
  const processingRef = useRef(false);
  const baselineRef = useRef<string | null>(null);

  const generating = generationStatus !== 'idle';

  useEffect(() => {
    if (!activeThreadId) createThread();
  }, [activeThreadId, createThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd } = el;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 240) + 'px';
    el.setSelectionRange(selectionStart, selectionEnd);
  }, [input]);

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

  useEffect(() => {
    const onElementClick = (e: Event) => {
      const detail = (e as CustomEvent<{ selector?: string }>).detail;
      if (detail?.selector) setSuggestionChip({ selector: detail.selector, html: '' });
    };
    window.addEventListener('p31:element-click', onElementClick);
    return () => window.removeEventListener('p31:element-click', onElementClick);
  }, []);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generating, input]);

  const handleChipClick = (selector: string) => {
    const html = suggestionChip?.html?.trim();
    setSuggestionChip(null);
    enqueue(html
      ? `Update the element matching "${selector}" to be more polished.\n\nCurrent markup:\n${html.slice(0, 2000)}`
      : `Update the element matching "${selector}" to be more polished.`);
  };

  const processJob = useCallback((prompt: string, agent: AgentId, repair?: ContractIssue): Promise<void> => {
    return new Promise<void>((resolve) => {
      void (async () => {
        const finish = () => { setIsStreaming(false); setStreaming(null); };
      const tokens = currentThemeTokens();
      setLastPrompt(prompt);
      setStreaming(null);
      setIsStreaming(true);
      setGenerationStatus('pending');

      const verifyStep = makeStep('verify', 'Verify output');
      const diffStep = makeStep('visual-diff', 'Visual diff');
      const rubricStep = makeStep('rubric', 'P31 rubric');
      const generateStep = makeStep('generate', 'Generate');
      const repairStep = makeStep('repair', 'Repair');
      if (repair) {
        pushPipelineStep(repairStep);
        updatePipelineStep(generateStep.id, { status: 'skipped' });
      } else {
        pushPipelineStep(generateStep);
      }
      pushPipelineStep(verifyStep);
      pushPipelineStep(diffStep);
      pushPipelineStep(rubricStep);
      updatePipelineStep(generateStep.id, { status: 'running' });

      try {
        const result = await remoteGenerate(prompt, tokens);

        if (result?.html) {
          updatePipelineStep(generateStep.id, { status: 'done', detail: `${result.html.length} chars` });

          let html = result.html;
          let issues = validateHtml(html);

          const autoRepair = !repair && issues.some((i) => i.severity === 'error');
          if (autoRepair) {
            pushPipelineStep(repairStep);
            updatePipelineStep(repairStep.id, { status: 'running' });
            const loop = await repairLoop({
              html,
              issues,
              maxRounds: 2,
              generateRepair: async (repairPrompt: string, currentHtml: string) => {
                const r = await remoteGenerate(`${repairPrompt}\n\nCurrent HTML to repair:\n${currentHtml.slice(0, 8000)}`, tokens);
                return r?.html ?? currentHtml;
              },
            });
            updatePipelineStep(repairStep.id, {
              status: loop.unresolved.length === 0 ? 'done' : 'blocked',
              issues: loop.unresolved.length > 0 ? loop.unresolved : undefined,
              detail: `${loop.resolvedCodes.length} resolved${loop.unresolved.length ? `, ${loop.unresolved.length} left` : ''}`,
            });
            if (loop.html !== html) {
              html = loop.html;
              issues = validateHtml(html);
            }
          }

          const rubric = runRubric(html);
          const diff = captureAndDiff(html, baselineRef.current ?? undefined);
          baselineRef.current = html;

          if (issues.length > 0) {
            updatePipelineStep(verifyStep.id, {
              status: issues.some((i) => i.severity === 'error') ? 'blocked' : 'done',
              issues,
              detail: `${issues.length} issue${issues.length > 1 ? 's' : ''}`,
            });
          } else {
            updatePipelineStep(verifyStep.id, { status: 'done', detail: 'contract clean' });
          }

          const diffIssue = visualDiffVerdictToIssue(diff);
          updatePipelineStep(diffStep.id, {
            status: diff.verdict === 'regression-likely' || diff.verdict === 'ambiguous' ? 'blocked' : 'done',
            issues: diffIssue ? [diffIssue] : undefined,
            detail: `${diff.verdict} · ${diff.regions.length} region${diff.regions.length === 1 ? '' : 's'}${diff.mode === 'first-run' ? ' (first render)' : ''}`,
          });

          updatePipelineStep(rubricStep.id, {
            status: 'done',
            issues: rubric.prioritized.length > 0 ? rubric.prioritized : undefined,
            detail: rubric.buckets.map((b) => `${b.bucket.label}: ${b.issues.length}`).join(' · '),
          });

          const proofBlocked = issues.some((i) => i.severity === 'error') || diff.verdict === 'regression-likely';
          setGenerationStatus('done');
          addMessage('assistant', proofBlocked
            ? 'Generated, but the proof gate failed — contract check and/or visual diff flags issues. Fix to ship.'
            : issues.length > 0
              ? 'Generated — proof gate passed (warnings only). Verify visually.'
              : 'Generated and proven clean: contract, rubber, and visual diff all pass.');
          maybeRefineTitle();
          onArtifactGenerated(prompt.slice(0, 40), html);
          finish(); resolve();
          return;
        }
        if (result?.url) {
          updatePipelineStep(generateStep.id, { status: 'done', detail: 'deployed' });
          updatePipelineStep(verifyStep.id, { status: 'skipped' });
          updatePipelineStep(diffStep.id, { status: 'skipped' });
          updatePipelineStep(rubricStep.id, { status: 'skipped' });
          setGenerationStatus('done');
          addMessage('assistant', `Deployed to ${result.url}`);
          maybeRefineTitle();
          finish(); resolve();
          return;
        }

        updatePipelineStep(generateStep.id, { status: 'running', detail: 'streaming fallback' });
        updatePipelineStep(verifyStep.id, { status: 'skipped' });
        updatePipelineStep(diffStep.id, { status: 'skipped' });
        updatePipelineStep(rubricStep.id, { status: 'skipped' });
        setGenerationStatus('streaming');
        setStreaming('');
        cancelRef.current = generateAssistantResponse(
          prompt,
          agent,
          tokens,
          (chunk) => appendStreamingText(chunk),
          (streamedHtml) => {
            setGenerationStatus('done');
            addMessage('assistant', 'Here\'s what I built:');
            maybeRefineTitle();
            onArtifactGenerated(prompt.slice(0, 40), streamedHtml);
            finish(); resolve();
          },
          (err) => {
            setGenerationStatus('error');
            addMessage('assistant', `Error: ${err}`);
            maybeRefineTitle();
            finish(); resolve();
          },
        );
      } catch {
        updatePipelineStep(generateStep.id, { status: 'error' });
        setGenerationStatus('error');
        addMessage('assistant', 'Generation failed. Please try again.');
        finish(); resolve();
      }
      })();
    });
  }, [onArtifactGenerated, addMessage, appendStreamingText, setStreaming, setIsStreaming, setGenerationStatus, setLastPrompt, pushPipelineStep, updatePipelineStep]);

  const pumpQueue = useCallback(async () => {
    if (processingRef.current) return;
    const job = queueRef.current.shift();
    if (!job) { setGenerationStatus('idle'); return; }
    processingRef.current = true;
    try {
      await processJob(job.prompt, job.agent, job.repair);
    } finally {
      processingRef.current = false;
      await pumpQueue();
    }
  }, [processJob, setGenerationStatus]);

  const enqueue = useCallback((text: string, repair?: ContractIssue) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    queueRef.current.push({ prompt: trimmed, agent: useSandboxStore.getState().activeAgent, repair });
    void pumpQueue();
  }, [pumpQueue]);

  const handleClarify = (text: string) => {
    clearPipeline();
    const questions = detectAmbiguities(text);
    if (questions.length > 0) {
      setPendingClarify({ prompt: text, questions });
      addMessage('user', text);
      return;
    }
    addMessage('user', text);
    enqueue(text);
  };

  const handleClarifyResolve = useCallback((answers: Record<string, string>) => {
    const pending = pendingClarify;
    if (!pending) return;
    setPendingClarify(null);
    const { prompt, notes } = resolveClarify(pending.prompt, answers);
    clearPipeline();
    const clarifyStep = makeStep('clarify', 'Clarify intent');
    pushPipelineStep(clarifyStep);
    updatePipelineStep(clarifyStep.id, { status: 'done', detail: notes.length ? notes.join(', ') : 'defaults' });
    enqueue(prompt);
  }, [pendingClarify, setPendingClarify, enqueue, clearPipeline, pushPipelineStep, updatePipelineStep]);

  const handleRepair = useCallback((issue: ContractIssue) => {
    const prior = queueRef.current.length;
    const fixPrompt = buildRepairPrompt(issue, prior);
    const current = baselineRef.current;
    const fullPrompt = current
      ? `${fixPrompt}\n\nCurrent HTML to repair:\n${current.slice(0, 8000)}`
      : fixPrompt;
    clearPipeline();
    enqueue(fullPrompt, issue);
  }, [enqueue, clearPipeline]);

  const handleRetry = () => {
    setGenerationStatus('idle');
    clearPipeline();
    queueRef.current = [];
    setIsStreaming(false);
    setStreaming(null);
  };

  const handleContinue = () => {
    setGenerationStatus('idle');
    setIsStreaming(false);
    setStreaming(null);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    handleClarify(text);
  };

  const handleStop = () => {
    cancelRef.current?.();
    cancelRef.current = null;
    queueRef.current = [];
    setIsStreaming(false);
    setGenerationStatus('idle');
    if (streamingText) {
      addMessage('assistant', streamingText);
      maybeRefineTitle();
      setStreaming(null);
    }
  };

  const streamingMessage: Message | null = isStreaming && streamingText != null
    ? { id: 'streaming', role: 'assistant', content: streamingText, timestamp: Date.now() }
    : null;

  const allMessages: Message[] = streamingMessage ? [...messages, streamingMessage] : messages;

  const shouldVirtualize = allMessages.length >= VIRTUAL_THRESHOLD;
  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? allMessages.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 80,
    overscan: 8,
    getItemKey: (i) => allMessages[i]?.id ?? i,
  });

  useEffect(() => {
    if (!shouldVirtualize || drifted) return;
    const n = allMessages.length;
    if (n === 0) return;
    virtualizer.scrollToIndex(n - 1, { align: 'end' });
  }, [allMessages.length, shouldVirtualize, drifted, virtualizer]);

  return (
    <>
      <div className="chat-pane-wrap">
        {!sidebarCollapsed && (
          <>
            <ChatSidebar />
            <div className="chat-sidebar-backdrop" onClick={toggleSidebar} aria-hidden="true" />
          </>
        )}
        <div className={`chat-pane${messages.length === 0 && !isStreaming ? ' chat-pane--empty' : ''}`}>
          {messages.length === 0 && !isStreaming ? (
            <div className="chat-empty-prompt">
              <div className="chat-empty-hero__mark" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 2 L21 8.5 L12 22 L3 8.5 Z" opacity="0.9" />
                  <path d="M12 9 L21 8.5 L12 14 L3 8.5 Z" opacity="0.45" fill="var(--p31-void, Canvas)" />
                </svg>
              </div>
              <h3 className="chat-empty-hero__title">What are we building today?</h3>
              <p className="chat-empty-hero__sub">
                Describe a component, layout, or flow. I'll generate it live with your design tokens.
              </p>
              <div className="chat-empty-cards">
                {PROMPT_CARDS.map((card) => (
                  <button
                    key={card.title}
                    type="button"
                    className="chat-empty-card"
                    onClick={() => { setInput(card.prompt); textareaRef.current?.focus(); }}
                  >
                    <span className="chat-empty-card__icon"><PromptIcon name={card.icon} /></span>
                    <span className="chat-empty-card__title">{card.title}</span>
                    <span className="chat-empty-card__desc">{card.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div
              className="chat-messages"
              ref={scrollRef}
              onScroll={onScroll}
              role="log"
              aria-live="polite"
              aria-atomic="false"
              aria-busy={generating}
            >
              {shouldVirtualize ? (
                <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%' }}>
                  {virtualizer.getVirtualItems().map((vi) => {
                    const msg = allMessages[vi.index];
                    return (
                      <div
                        key={vi.key}
                        data-index={vi.index}
                        ref={virtualizer.measureElement}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vi.start}px)` }}
                      >
                        <ChatMessage message={msg} isStreaming={msg.id === 'streaming'} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                allMessages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} isStreaming={msg.id === 'streaming'} />
                ))
              )}
              {generating && !streamingMessage && (
                <div className="chat-msg chat-msg--assistant">
                  <div className="chat-msg-bubble">
                    <span className="chat-msg-thinking">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
              {drifted && (
                <button
                  type="button"
                  className="jump-to-bottom"
                  onClick={() => {
                    setDrifted(false);
                    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
                  }}
                >
                  Jump to bottom
                </button>
              )}
            </div>
          )}

          <div className="chat-composer" role="form" aria-label="Chat composer">
            {(generationStatus === 'pending' || generationStatus === 'streaming') && (
              <div className="chat-generation-status">
                <span className="status-dot" aria-hidden="true" />
                {generationStatus === 'pending' ? 'Calling generator\u2026' : 'Streaming\u2026'}
              </div>
            )}
            {suggestionChip && (
              <div className="suggestion-chip" onClick={() => handleChipClick(suggestionChip.selector)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleChipClick(suggestionChip.selector); } }}>
                <span>Edit element: <code>{suggestionChip.selector}</code></span>
                 <button className="suggestion-chip-dismiss" onClick={(e) => { e.stopPropagation(); setSuggestionChip(null); }} aria-label="Dismiss suggestion">Dismiss</button>
              </div>
            )}
            {pendingClarify && (
              <ClarifyGate
                originalPrompt={pendingClarify.prompt}
                questions={pendingClarify.questions}
                onResolve={handleClarifyResolve}
                onCancel={() => setPendingClarify(null)}
              />
            )}
            <ToolTimeline
              steps={pipelineSteps}
              onRepair={handleRepair}
              onRetry={handleRetry}
              onContinue={handleContinue}
            />
            <GlassPanel padding="md" className="chat-composer-panel chat-composer-panel--solid">
              <textarea
                ref={textareaRef}
                className="chat-composer-input"
                placeholder="Describe the UI you want to build..."
                aria-label="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={generationStatus !== 'idle' || pendingClarify !== null}
              />
              <div className="chat-composer-actions">
                <AgentSelector
                  className="composer-agent-selector"
                  active={activeAgent}
                  onChange={setActiveAgent}
                />
                {generating ? (
                  <Button variant="primary" className="chat-composer-stop" onClick={handleStop}>
                    Stop
                  </Button>
                ) : (
                  <Button variant="primary" className="chat-composer-send" onClick={handleSend} disabled={!input.trim()} aria-label="Send message">
                    Send
                  </Button>
                )}
              </div>
            </GlassPanel>
          </div>
        </div>
      </div>
    </>
  );
}
