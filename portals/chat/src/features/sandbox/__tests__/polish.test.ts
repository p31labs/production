import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useSandboxStore } from '../sandboxStore';
import type { Message } from '../types';

function makeThreadWithMessages(user: string, assistant: string) {
  const { createThread, addMessage, setActiveThread } = useSandboxStore.getState();
  const t = createThread('test');
  setActiveThread(t.id);
  addMessage('user', user);
  addMessage('assistant', assistant);
  return t.id;
}

describe('regenerate', () => {
  beforeEach(() => {
    useSandboxStore.setState({
      threads: [],
      activeThreadId: null,
      messages: {},
      artifacts: {},
      queuedPrompt: null,
      generationStatus: 'idle',
      streamingText: null,
      isStreaming: false,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('truncates the thread at the preceding user message and queues its prompt', () => {
    const tid = makeThreadWithMessages('build a dashboard', 'here is your dashboard');
    const msgs = useSandboxStore.getState().messages[tid];
    const assistantId = msgs[msgs.length - 1].id;

    useSandboxStore.getState().regenerate(assistantId);

    const next = useSandboxStore.getState();
    expect(next.messages[tid]).toHaveLength(1);
    expect(next.messages[tid][0].role).toBe('user');
    expect(next.messages[tid][0].content).toBe('build a dashboard');
    expect(next.queuedPrompt).toBe('build a dashboard');
    expect(next.isStreaming).toBe(false);
    expect(next.streamingText).toBeNull();
  });

  it('keeps messages up to and including the user turn when a follow-up follows', () => {
    const tid = makeThreadWithMessages('first', 'reply one');
    useSandboxStore.getState().addMessage('user', 'second');
    useSandboxStore.getState().addMessage('assistant', 'reply two');
    const msgs = useSandboxStore.getState().messages[tid];
    const secondAssistantId = msgs[msgs.length - 1].id;

    useSandboxStore.getState().regenerate(secondAssistantId);

    const next = useSandboxStore.getState();
    const roles = next.messages[tid].map((m) => m.role);
    expect(roles).toEqual(['user', 'assistant', 'user']);
    expect(next.queuedPrompt).toBe('second');
  });

  it('is a no-op for an unknown message id', () => {
    const tid = makeThreadWithMessages('a', 'b');
    const before = useSandboxStore.getState().messages[tid].length;
    useSandboxStore.getState().regenerate('does-not-exist');
    expect(useSandboxStore.getState().messages[tid]).toHaveLength(before);
    expect(useSandboxStore.getState().queuedPrompt).toBeNull();
  });
});

describe('presentation prefs', () => {
  beforeEach(() => {
    localStorage.clear();
    useSandboxStore.setState({
      verbosity: 'standard',
      toneLabels: true,
      reducedStimulation: false,
      breakOpen: false,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('sets and persists verbosity', () => {
    useSandboxStore.getState().setVerbosity('detail');
    expect(useSandboxStore.getState().verbosity).toBe('detail');
    const stored = JSON.parse(localStorage.getItem('p31-chat-prefs') || '{}');
    expect(stored.verbosity).toBe('detail');
  });

  it('sets and persists tone labels and calm colors together', () => {
    useSandboxStore.getState().setToneLabels(false);
    useSandboxStore.getState().setReducedStimulation(true);
    const stored = JSON.parse(localStorage.getItem('p31-chat-prefs') || '{}');
    expect(stored.toneLabels).toBe(false);
    expect(stored.reducedStimulation).toBe(true);
    expect(useSandboxStore.getState().toneLabels).toBe(false);
    expect(useSandboxStore.getState().reducedStimulation).toBe(true);
  });

  it('defaults to standard / on / off when no prefs are stored', () => {
    localStorage.clear();
    const verbosity = useSandboxStore.getState().verbosity;
    const toneLabels = useSandboxStore.getState().toneLabels;
    const reducedStimulation = useSandboxStore.getState().reducedStimulation;
    expect(verbosity).toBe('standard');
    expect(toneLabels).toBe(true);
    expect(reducedStimulation).toBe(false);
  });

  it('opens and closes the break module', () => {
    useSandboxStore.getState().setBreakOpen(true);
    expect(useSandboxStore.getState().breakOpen).toBe(true);
    useSandboxStore.getState().setBreakOpen(false);
    expect(useSandboxStore.getState().breakOpen).toBe(false);
  });
});

describe('queuePrompt', () => {
  it('sets and clears the queued prompt signal', () => {
    useSandboxStore.getState().queuePrompt('a prompt');
    expect(useSandboxStore.getState().queuedPrompt).toBe('a prompt');
    useSandboxStore.getState().queuePrompt(null);
    expect(useSandboxStore.getState().queuedPrompt).toBeNull();
  });
});

// Keep Message type referenced for parity with the persistence test style.
void (null as unknown as Message);