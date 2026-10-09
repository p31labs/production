import { useRef, useState, useEffect, useCallback } from 'react';
import { useShellStore } from '../store/useShellStore';
import { useAppStore } from '../store/useAppStore';
import { sendChat, streamChatTurn, buildShellContext, type ChatMessage, SENSITIVE_COMMANDS } from '../lib/llm';
import { isWebGpuAvailable, isLocalReady, initLocalEngine, localChatWithTools, destroyLocalEngine, getModelId } from '../lib/localLlm';
import { executeCommand, getOpenAIFunctionDefinitions } from '../lib/commands';
import type { ChatCompletionMessageParam, ChatCompletionTool } from '@mlc-ai/web-llm';
import { persistThreads } from '../lib/memory';
import { useVoiceInput } from '../hooks/useVoiceInput';

interface PendingCall {
  name: string;
  args: Record<string, unknown>;
  resolve: (approved: boolean) => void;
}

export default function AssistantPanel() {
  const open = useShellStore((s) => s.assistantOpen);
  const setOpen = useShellStore((s) => s.setAssistantOpen);
  const threads = useShellStore((s) => s.threads);
  const appendMessage = useShellStore((s) => s.appendMessage);
  const replaceLastMessage = useShellStore((s) => s.replaceLastMessage);
  const clearThread = useShellStore((s) => s.clearThread);
  const streaming = useShellStore((s) => s.streaming);
  const setStreaming = useShellStore((s) => s.setStreaming);
  const localStatus = useShellStore((s) => s.localStatus);
  const localProgress = useShellStore((s) => s.localProgress);
  const setLocalStatus = useShellStore((s) => s.setLocalStatus);
  const assistantMode = useShellStore((s) => s.assistantMode);
  const setAssistantMode = useShellStore((s) => s.setAssistantMode);

  const spoons = useAppStore((s) => s.spoons);
  const tab = useAppStore((s) => s.tab);
  const loveBalance = useAppStore((s) => s.loveBalance);

  const [input, setInput] = useState('');
  const [persona, setPersona] = useState<'shell' | 'phos'>('shell');
  const [pendingCall, setPendingCall] = useState<PendingCall | null>(null);
  const [lastLocal, setLastLocal] = useState(false);
  const voice = useVoiceInput();
  const abortRef = useRef<AbortController | null>(null);
  const sendRef = useRef<(text: string) => Promise<void>>(async () => {});
  const bodyRef = useRef<HTMLDivElement>(null);

  const currentThread = threads[threads.length - 1] ?? [];

  const isWebGpu = isWebGpuAvailable();

  const cycleAssistantMode = useCallback(() => {
    if (!isWebGpu) {
      setAssistantMode(assistantMode === 'cloud' ? 'auto' : 'cloud');
      setLocalStatus('idle');
      return;
    }
    const next = assistantMode === 'auto' ? 'local' : assistantMode === 'local' ? 'cloud' : 'auto';
    setAssistantMode(next);
    if (next !== 'local') setLocalStatus('idle');
  }, [assistantMode, isWebGpu, setAssistantMode, setLocalStatus]);

  useEffect(() => {
    if (open && threads.length === 0) {
      clearThread();
      appendMessage({
        role: 'assistant',
        content: "👋 I'm your P31 assistant. I can see your spoons, tab, and LOVE balance, and I can run shell commands on your behalf.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [currentThread.length, streaming]);

  useEffect(() => {
    persistThreads(threads).catch(() => {});
  }, [threads]);

  useEffect(() => {
    if (voice.final && voice.transcript.trim()) {
      if (voice.autoSend) {
        voice.reset();
        sendRef.current(voice.transcript.trim());
      } else {
        setInput(voice.transcript);
        voice.reset();
      }
    }
  }, [voice.final, voice.transcript, voice.autoSend, voice.reset]);

  const handleChip = useCallback(
    (label: string) => {
      if (label === 'Set spoons') {
        appendMessage({ role: 'assistant', content: 'Use ⌘K → “Set spoon level” to choose 0–5. This is a sensitive command, so it runs from the palette, not from me.' });
        return;
      }
      if (label === 'Refresh LOVE') {
        executeCommand('love:refresh')
          .then(() => appendMessage({ role: 'assistant', content: '💎 LOVE balance refreshed.' }))
          .catch(() => appendMessage({ role: 'assistant', content: '💎 Could not reach the ledger.', error: true }));
        return;
      }
      if (label === 'Summarize notifications') {
        setInput('Summarize my notifications');
        return;
      }
    },
    [appendMessage],
  );

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || streaming) return;
    setInput('');
    appendMessage({ role: 'user', content: message });
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const history: ChatMessage[] = currentThread.map((m) => ({ role: m.role, content: m.content }));

    const tools: ChatCompletionTool[] = getOpenAIFunctionDefinitions().map((f) => ({
      type: 'function',
      function: {
        name: f.function.name,
        description: f.function.description,
        parameters: f.function.parameters,
      },
    }));

    const localEligible = isWebGpuAvailable()
      && (assistantMode === 'local' || (assistantMode === 'auto' && isLocalReady()));

    if (localEligible) {
      try {
        const engineReady = isLocalReady() || (assistantMode === 'local' && (await initLocalEngine()));
        if (engineReady) {
          const localMessages: ChatCompletionMessageParam[] = currentThread.map((m): ChatCompletionMessageParam =>
            m.role === 'assistant'
              ? { role: 'assistant', content: m.content }
              : { role: 'user', content: m.content },
          );
          localMessages.push({ role: 'user', content: message });
          const reply = await localChatWithTools(localMessages, tools);
          if (reply) {
            setLastLocal(true);
            appendMessage({ role: 'assistant', content: reply });
            setStreaming(false);
            abortRef.current = null;
            return;
          }
        }
      } catch {
        // fall back to cloud
      }
    }

    setLastLocal(false);

    try {
      const turn = await sendChat(message, history, {
        signal: controller.signal,
        portal: persona,
        context: buildShellContext(),
        onToolCall: (name, args) => {
          if (!SENSITIVE_COMMANDS.has(name)) return true; // auto-approve non-sensitive
          return new Promise<boolean>((resolve) => {
            setPendingCall({ name, args, resolve });
          });
        },
      });

      if (controller.signal.aborted) return;

      appendMessage({ role: 'assistant', content: '' });
      const onTick = (partial: string) => {
        if (controller.signal.aborted) return;
        replaceLastMessage(partial);
      };
      await streamChatTurn(turn, { onTick, signal: controller.signal });
    } catch (err) {
      if (!controller.signal.aborted) {
        appendMessage({
          role: 'assistant',
          content: err instanceof Error ? `❌ ${err.message}` : '❌ Something went wrong.',
          error: true,
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  sendRef.current = send;

  const cancel = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  const resolveCall = (approved: boolean) => {
    const call = pendingCall;
    setPendingCall(null);
    call?.resolve(approved);
  };

  return (
    <aside className={`assistant-panel${open ? ' open' : ''}`} aria-hidden={!open}>
      <div className="assistant-panel-header">
        <h2 className="assistant-title">🧠 Assistant</h2>
        <div className="assistant-persona-chips">
          <button
            type="button"
            className={`assistant-persona-chip${persona === 'shell' ? ' active' : ''}`}
            onClick={() => setPersona('shell')}
            title="BASH — direct, concise, shell-aware"
          >
            BASH
          </button>
          <button
            type="button"
            className={`assistant-persona-chip${persona === 'phos' ? ' active' : ''}`}
            onClick={() => setPersona('phos')}
            title="PHOS — warm, patient, the original P31 guide"
          >
            PHOS
          </button>
          <button
            type="button"
            className={`assistant-local-chip${assistantMode !== 'cloud' ? ' active' : ''}${!isWebGpu && assistantMode !== 'cloud' ? ' unavailable' : ''}`}
            onClick={cycleAssistantMode}
            title={
              !isWebGpu
                ? 'Local inference requires WebGPU (Chrome 113+)'
                : assistantMode === 'local'
                  ? 'On-device mode active — every query runs locally, no cloud'
                  : assistantMode === 'cloud'
                    ? 'Cloud mode — all queries route to portal-chat'
                    : 'Auto mode — runs locally when the engine is ready, otherwise cloud'
            }
            aria-disabled={!isWebGpu}
          >
            {assistantMode === 'local'
              ? localProgress != null ? `${localProgress}%` : localStatus === 'loading' ? '…' : localStatus === 'ready' ? '⚡' : 'On-device'
              : assistantMode}
          </button>
        </div>
        <span className="assistant-mode-badge" title="Engine mode — click the chip to cycle auto → local → cloud">
          {assistantMode === 'auto' ? 'auto' : assistantMode === 'local' ? '⚡ local' : '☁ cloud'}
        </span>
        {lastLocal ? (
          <span className="assistant-engine-badge local" title="Served by on-device inference">{getModelId()} · on-device · no cloud</span>
        ) : (
          <span className="assistant-engine-badge edge" title="Served by portal-chat cloud">☁ edge</span>
        )}
        <div className="assistant-header-actions">
          {streaming && (
            <button type="button" className="assistant-icon-btn" onClick={cancel} aria-label="Stop generating" title="Stop generating">
              ⏹
            </button>
          )}
          <button type="button" className="assistant-icon-btn" onClick={() => setOpen(false)} aria-label="Close" title="Close">
            ✕
          </button>
        </div>
      </div>

      <div ref={bodyRef} className="assistant-panel-body">
        <div className="assistant-chips">
          <button type="button" className="assistant-chip" onClick={() => handleChip('Set spoons')}>
            🥄 Spoons {spoons}/5
          </button>
          <button type="button" className="assistant-chip" onClick={() => handleChip('Refresh LOVE')}>
            💎 {loveBalance?.availableBalance ?? 'LOVE'}
          </button>
          <button type="button" className="assistant-chip" onClick={() => handleChip('Summarize notifications')}>
            📋 Summarize alerts
          </button>
          <span className="assistant-chip-static">Tab: {tab}</span>
        </div>

        {currentThread.map((msg, i) => (
          <div key={i} className={`assistant-message ${msg.role}${msg.error ? ' error' : ''}`}>
            {msg.content || '…'}
          </div>
        ))}

        {pendingCall && (
          <div className="tool-approval">
            <div className="tool-approval-title">⚠️ Run tool?</div>
            <div className="tool-approval-call">
              <code>{pendingCall.name}</code>
              <pre>{JSON.stringify(pendingCall.args, null, 2)}</pre>
            </div>
            <div className="tool-approval-actions">
              <button type="button" className="btn ghost" onClick={() => resolveCall(false)}>Reject</button>
              <button type="button" className="btn primary" onClick={() => resolveCall(true)}>Confirm</button>
            </div>
          </div>
        )}
      </div>

      <div className="assistant-panel-input">
        <input
          type="text"
          placeholder="Ask me anything…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) send(input);
          }}
          disabled={streaming || !!pendingCall}
        />
        <button
          type="button"
          className={`voice-mic${voice.listening ? ' voice-listening' : ''}`}
          onClick={() => voice.listening ? voice.stop() : voice.start()}
          disabled={!voice.supported || streaming || !!pendingCall}
          title={voice.supported ? (voice.listening ? 'Stop listening' : 'Voice input') : 'Voice input unavailable'}
        >
          {voice.listening ? '🔴' : !voice.listening && voice.transcript ? '…' : '🎤'}
        </button>
        {voice.supported && (
          <button
            type="button"
            className="assistant-icon-btn"
            onClick={() => voice.setAutoSend(!voice.autoSend)}
            title={voice.autoSend ? 'Auto-send ON — transcript submits automatically' : 'Auto-send OFF — transcript fills input'}
            style={{ fontSize: '0.65rem', padding: '2px 6px', opacity: voice.autoSend ? 1 : 0.5 }}
          >
            {voice.autoSend ? '⚡' : 'AUTO'}
          </button>
        )}
        {voice.error && <span className="voice-error">{voice.error}</span>}
        <button type="button" className="assistant-send" onClick={() => send(input)} disabled={streaming || !!pendingCall || !input.trim()}>
          {streaming ? '…' : 'Send'}
        </button>
      </div>
    </aside>
  );
}
