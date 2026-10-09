import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ReactNode } from 'react';
import { useSandboxStore } from './sandboxStore';
import { useMediaQuery } from '../../lib/useMediaQuery';
import ChatSidebar from './ChatSidebar';
import ChatMessage from './ChatMessage';
import AgentSelector from './AgentSelector';
import ClarifyGate from './ClarifyGate';
import ToolTimeline from './ToolTimeline';
import type { Message, AgentId } from './sandboxStore';
import { remoteGenerate, currentThemeTokens, remoteTitle, type ThemeTokens } from './remote';
import { detectAmbiguities, resolveClarify } from './clarify';
import { validateHtml, runRubric, buildRepairPrompt, makeStep, repairLoop, type ContractIssue } from './pipeline';
import { verifyVisual } from './visual';
import { captureAndDiff, visualDiffVerdictToIssue } from './visualDiff';
import { Button, GlassPanel } from '@p31ca/design-core/compositions';
import BreakModule from './BreakModule';

const VIRTUAL_THRESHOLD = 50;

const PROMPT_CARDS = [
  {
    icon: 'chart',
    title: 'Build a dashboard',
    desc: 'Calming overview with a live spoon meter',
    prompt: 'Build a calming dashboard with a live spoon meter',
  },
  {
    icon: 'form',
    title: 'Create a login form',
    desc: 'Email + password with inline validation',
    prompt: 'Create a login form with email, password, and inline validation',
  },
  {
    icon: 'grid',
    title: 'Design a card grid',
    desc: 'Glass borders and hover lift',
    prompt: 'Make a card grid with glass borders and hover lift',
  },
  {
    icon: 'gear',
    title: 'Build a settings page',
    desc: 'Profile, theme, and toggles layout',
    prompt: 'Generate a settings page layout with profile, theme, and toggle controls',
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

  const systemPrompt = `You are the ${agent} agent in the P31 Sandbox. You generate HTML UI components.
Rules:
- Output ONLY valid HTML. No markdown wrapping, no code fences, no explanations.
- Use embedded CSS inside <style> tags, not external files.
- Color scheme must match the current P31 theme exactly: background ${tokens.bg}, text ${tokens.text}, accent ${tokens.accent}.
- Use system-ui font.
- Keep the output under 200 lines.
- The user prompt describes what to build. Generate it directly.`;

  const sendToWorker = async () => {
    try {
      const response = await fetch('/api/generate', {
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
    } catch (e) {
      if (!cancelled) onError(String(e));
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
  const artifactOpen = useSandboxStore((s) => s.artifactOpen);
  const toggleArtifact = useSandboxStore((s) => s.toggleArtifact);
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
  const verbosity = useSandboxStore((s) => s.verbosity);
  const toneLabels = useSandboxStore((s) => s.toneLabels);
  const reducedStimulation = useSandboxStore((s) => s.reducedStimulation);
  const setVerbosity = useSandboxStore((s) => s.setVerbosity);
  const setToneLabels = useSandboxStore((s) => s.setToneLabels);
  const setReducedStimulation = useSandboxStore((s) => s.setReducedStimulation);
  const setBreakOpen = useSandboxStore((s) => s.setBreakOpen);
  const queuedPrompt = useSandboxStore((s) => s.queuedPrompt);

  const [input, setInput] = useState('');
  const [suggestionChip, setSuggestionChip] = useState<{ selector: string; html: string } | null>(null);
  const [drifted, setDrifted] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);

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
  const composerFormRef = useRef<HTMLFormElement>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const queueRef = useRef<{ prompt: string; agent: AgentId; repair?: ContractIssue }[]>([]);
  const processingRef = useRef(false);
  const baselineRef = useRef<string | null>(null);

  const generating = generationStatus !== 'idle';

  useEffect(() => {
    if (!activeThreadId) createThread();
  }, [activeThreadId, createThread]);

  // Mobile-first: a fresh mobile session lands on the chat, not the drawer.
  const prefersMobile = useMediaQuery('(max-width: 639px)');
  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    if (prefersMobile && !sidebarCollapsed) useSandboxStore.getState().toggleSidebar();
  }, [prefersMobile, sidebarCollapsed]);

  // Reduced-stimulation CSS override on <html>.
  useEffect(() => {
    document.documentElement.setAttribute('data-reduced-stimulation', String(reducedStimulation));
  }, [reducedStimulation]);

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
  }, [generating, input]);

  const handleChipClick = (selector: string) => {
    const html = suggestionChip?.html?.trim();
    setSuggestionChip(null);
    enqueue(html
      ? `Update the element matching "${selector}" to be more polished.\n\nCurrent markup:\n${html.slice(0, 2000)}`
      : `Update the element matching "${selector}" to be more polished.`);
  };

  const processJob = useCallback((prompt: string, agent: AgentId, repair?: ContractIssue): Promise<void> => {
    return new Promise<void>(async (resolve) => {
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
          const visual = verifyVisual(html);
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

  // Regenerate / Edit signal: consume `queuedPrompt` via the single send path.
  useEffect(() => {
    if (!queuedPrompt) return;
    if (generationStatus !== 'idle' || pendingClarify) return;
    const prompt = queuedPrompt;
    useSandboxStore.getState().queuePrompt(null);
    addMessage('user', prompt);
    enqueue(prompt);
  }, [queuedPrompt, generationStatus, pendingClarify, addMessage, enqueue]);

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
    if (sendingRef.current) return;
    const text = input.trim();
    if (!text) return;
    sendingRef.current = true;
    setInput('');
    handleClarify(text);
    window.setTimeout(() => { sendingRef.current = false; }, 0);
  };

  const handleComposerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
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
        <ChatSidebar open={!sidebarCollapsed} />
        <div className={`chat-sidebar-backdrop${!sidebarCollapsed ? ' chat-sidebar-backdrop--open' : ''}`} onClick={toggleSidebar} aria-hidden="true" />
        <div className={`chat-pane${messages.length === 0 && !isStreaming ? ' chat-pane--empty' : ''}`}>
          <div className="chat-control-bar" role="toolbar" aria-label="Chat controls">
            <button
              type="button"
              className="chat-control-bar__btn"
              onClick={toggleSidebar}
              aria-pressed={!sidebarCollapsed}
              aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
              title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="15" y2="18" />
              </svg>
            </button>
            {artifactOpen && (
              <button
                type="button"
                className="chat-control-bar__btn"
                onClick={toggleArtifact}
                aria-pressed={artifactOpen}
                aria-label="Toggle artifact preview"
                title="Toggle artifact preview"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
              </button>
            )}
            <button
              type="button"
              className="chat-control-bar__btn"
              onClick={() => window.dispatchEvent(new CustomEvent('p31:popout'))}
              aria-label="Open in new window"
              title="Open in new window"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
            <button
              type="button"
              className={`chat-control-bar__btn${reducedStimulation ? ' chat-control-bar__btn--active' : ''}`}
              onClick={() => setReducedStimulation(!reducedStimulation)}
              aria-pressed={reducedStimulation}
              aria-label="Toggle starfield"
              title="Toggle starfield"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
              </svg>
            </button>
          </div>
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
                    data-agent-kind="action"
                    data-agent-action="chat.send"
                    onClick={() => handleClarify(card.prompt)}
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
                  <div className="chat-msg-content">
                    <span className="chat-thinking" role="status" aria-live="polite">
                      <span className="chat-thinking__shimmer" aria-hidden="true" />
                      <span className="chat-thinking__stage">
                        {generationStatus === 'pending' ? 'Calling generator\u2026' : 'Streaming\u2026'}
                      </span>
                    </span>
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

          <div className="chat-composer">
            {(generationStatus === 'pending' || generationStatus === 'streaming') && (
              <div className="chat-generation-status" role="status" aria-live="polite" aria-atomic="true">
                <span className="chat-thinking__shimmer" aria-hidden="true" />
                {generationStatus === 'pending' ? 'Calling generator\u2026' : 'Streaming\u2026'}
              </div>
            )}
            {suggestionChip && (
              <div className="suggestion-chip" role="group" aria-label="Element suggestion">
                <button
                  type="button"
                  className="suggestion-chip-action"
                  onClick={() => handleChipClick(suggestionChip.selector)}
                >
                  <span>Edit element: <code>{suggestionChip.selector}</code></span>
                </button>
                <button
                  type="button"
                  className="suggestion-chip-dismiss"
                  onClick={() => setSuggestionChip(null)}
                  aria-label="Dismiss suggestion"
                >
                  Dismiss
                </button>
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
              <form
                ref={composerFormRef}
                className="chat-composer-form"
                aria-label="Chat composer"
                aria-busy={generating}
                onSubmit={handleComposerSubmit}
              >
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
                      composerFormRef.current?.requestSubmit();
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
                  <div className={`composer-prefs${prefsOpen ? ' composer-prefs--open' : ''}`} id="composer-prefs">
                    <label className="composer-pref">
                      <span className="composer-pref-label" id="verbosity-label">Length</span>
                      <select
                        className="composer-pref-select"
                        aria-labelledby="verbosity-label"
                        value={verbosity}
                        onChange={(e) => setVerbosity(e.target.value as 'shorter' | 'standard' | 'detail')}
                        disabled={generationStatus !== 'idle'}
                      >
                        <option value="shorter">Shorter</option>
                        <option value="standard">Standard</option>
                        <option value="detail">More detail</option>
                      </select>
                    </label>
                    <label className="composer-pref composer-pref--toggle">
                      <input
                        type="checkbox"
                        checked={toneLabels}
                        onChange={(e) => setToneLabels(e.target.checked)}
                        disabled={generationStatus !== 'idle'}
                      />
                      <span className="composer-pref-label">Tone labels</span>
                    </label>
                    <label className="composer-pref composer-pref--toggle">
                      <input
                        type="checkbox"
                        checked={reducedStimulation}
                        onChange={(e) => setReducedStimulation(e.target.checked)}
                      />
                      <span className="composer-pref-label">Calm colors</span>
                    </label>
                    <button
                      type="button"
                      className="composer-break"
                      onClick={() => setBreakOpen(true)}
                      aria-label="Take a break"
                      title="Take a break"
                    >
                      Take a break
                    </button>
                  </div>
                  <button
                    type="button"
                    className="composer-prefs-toggle"
                    onClick={() => setPrefsOpen((o) => !o)}
                    aria-expanded={prefsOpen}
                    aria-controls="composer-prefs"
                    aria-label={prefsOpen ? 'Hide composer options' : 'Composer options'}
                    title="Composer options"
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
                    </svg>
                    Options
                  </button>
                  {generating ? (
                    <Button variant="primary" type="button" className="chat-composer-stop" onClick={handleStop} data-agent-kind="action" data-agent-action="chat.stop">
                      Stop
                    </Button>
                  ) : (
                    <Button variant="primary" type="submit" className="chat-composer-send" disabled={!input.trim()} aria-label="Send message" data-agent-kind="action" data-agent-action="chat.send">
                      Send
                    </Button>
                  )}
                </div>
              </form>
            </GlassPanel>
            <p className="chat-composer-disclaimer">
              Generated output can be imperfect. Double-check anything important before you ship it.
            </p>
          </div>
        </div>
      </div>
      <BreakModule />
    </>
  );
}
