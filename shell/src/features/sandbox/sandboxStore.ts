import { create } from 'zustand';
import type { AgentId, Message, Artifact, Thread, MonitorData, ToolCallEvent, GenerationStatus } from './types';

export type { AgentId, Message, Artifact, Thread, MonitorData, ToolCallEvent, GenerationStatus, ArtifactVersion, Tab, Device, ConsoleEntry, InspectorNode, SplitState } from './types';

export interface SandboxState {
  threads: Thread[];
  activeThreadId: string | null;
  messages: Record<string, Message[]>;
  artifacts: Record<string, Artifact[]>;
  activeArtifactId: string | null;
  streamingText: string | null;
  isStreaming: boolean;
  generationStatus: GenerationStatus;
  lastPrompt: string | null;
  splitPosition: number;
  activeAgent: AgentId;
  sidebarCollapsed: boolean;
  artifactOpen: boolean;
  lastDeployUrl: string | null;

  createThread: (title?: string) => Thread;
  deleteThread: (id: string) => void;
  setActiveThread: (id: string) => void;
  renameThread: (id: string, title: string) => void;

  addMessage: (role: 'user' | 'assistant', content: string, toolCalls?: ToolCallEvent[]) => void;
  setStreaming: (text: string | null) => void;
  setIsStreaming: (v: boolean) => void;
  appendStreamingText: (chunk: string) => void;
  setGenerationStatus: (status: GenerationStatus) => void;
  setLastPrompt: (prompt: string | null) => void;

  addArtifact: (title: string, code: string, html: string) => Artifact;
  updateArtifactCode: (artifactId: string, code: string) => void;
  setArtifactMonitor: (artifactId: string, monitor: Artifact['monitor']) => void;
  snapshotArtifactVersion: (artifactId: string) => void;
  deleteArtifact: (artifactId: string) => void;
  setActiveArtifact: (id: string | null) => void;

  setSplitPosition: (pos: number) => void;
  setActiveAgent: (agent: AgentId) => void;
  toggleSidebar: () => void;
  setArtifactOpen: (open: boolean) => void;
  toggleArtifact: () => void;
  setLastDeployUrl: (url: string) => void;

  hydrate: (threads: Thread[], messages: Record<string, Message[]>, artifacts: Record<string, Artifact[]>) => void;
}

let _msgSeq = 0;
let _threadSeq = 0;
let _artifactSeq = 0;

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${_msgSeq++}`;
}

export const useSandboxStore = create<SandboxState>((set, get) => ({
  threads: [],
  activeThreadId: null,
  messages: {},
  artifacts: {},
  activeArtifactId: null,
  streamingText: null,
  isStreaming: false,
  generationStatus: 'idle',
  lastPrompt: null,
  splitPosition: 50,
  activeAgent: 'mechanic',
  sidebarCollapsed: false,
  artifactOpen: false,
  lastDeployUrl: null,

  createThread: (title) => {
    const id = uid('thread');
    _threadSeq++;
    const thread: Thread = { id, title: title || `Untitled ${_threadSeq}`, createdAt: Date.now(), updatedAt: Date.now() };
    set((s) => ({
      threads: [thread, ...s.threads],
      activeThreadId: id,
      messages: { ...s.messages, [id]: [] },
      artifacts: { ...s.artifacts, [id]: [] },
      activeArtifactId: null,
    }));
    return thread;
  },

  deleteThread: (id) => {
    set((s) => {
      const next = { ...s.messages }; delete next[id];
      const nextA = { ...s.artifacts }; delete nextA[id];
      const threads = s.threads.filter((t) => t.id !== id);
      const activeThreadId = s.activeThreadId === id ? (threads[0]?.id ?? null) : s.activeThreadId;
      return { threads, activeThreadId, messages: next, artifacts: nextA, activeArtifactId: null };
    });
  },

  setActiveThread: (id) => set({ activeThreadId: id, activeArtifactId: null }),

  renameThread: (id, title) => set((s) => ({
    threads: s.threads.map((t) => (t.id === id ? { ...t, title, updatedAt: Date.now() } : t)),
  })),

  addMessage: (role, content, toolCalls) => {
    const threadId = get().activeThreadId;
    if (!threadId) return;
    const msg: Message = { id: uid('msg'), role, content, toolCalls, timestamp: Date.now() };
    set((s) => ({
      messages: { ...s.messages, [threadId]: [...(s.messages[threadId] || []), msg] },
      threads: s.threads.map((t) => (t.id === threadId ? { ...t, updatedAt: Date.now() } : t)),
    }));
  },

  setStreaming: (text) => set({ streamingText: text }),

  setIsStreaming: (v) => set({ isStreaming: v }),

  appendStreamingText: (chunk) => set((s) => ({ streamingText: (s.streamingText || '') + chunk })),

  setGenerationStatus: (status) => set({ generationStatus: status }),

  setLastPrompt: (prompt) => set({ lastPrompt: prompt }),

  addArtifact: (title, code, html) => {
    const threadId = get().activeThreadId;
    if (!threadId) throw new Error('No active thread');
    const art: Artifact = { id: uid('art'), title, code, html, monitor: null, versions: [{ code, html, timestamp: Date.now() }], createdAt: Date.now() };
    _artifactSeq++;
    set((s) => ({
      artifacts: { ...s.artifacts, [threadId]: [...(s.artifacts[threadId] || []), art] },
      activeArtifactId: art.id,
    }));
    return art;
  },

  updateArtifactCode: (artifactId, code) => {
    const threadId = get().activeThreadId;
    if (!threadId) return;
    set((s) => ({
      artifacts: {
        ...s.artifacts,
        [threadId]: (s.artifacts[threadId] || []).map((a) => (a.id === artifactId ? { ...a, code } : a)),
      },
    }));
  },

  setArtifactMonitor: (artifactId, monitor) => {
    const threadId = get().activeThreadId;
    if (!threadId) return;
    set((s) => ({
      artifacts: {
        ...s.artifacts,
        [threadId]: (s.artifacts[threadId] || []).map((a) => (a.id === artifactId ? { ...a, monitor } : a)),
      },
    }));
  },

  snapshotArtifactVersion: (artifactId) => {
    const threadId = get().activeThreadId;
    if (!threadId) return;
    set((s) => ({
      artifacts: {
        ...s.artifacts,
        [threadId]: (s.artifacts[threadId] || []).map((a) => {
          if (a.id !== artifactId || a.versions.length >= 10) return a;
          return { ...a, versions: [...a.versions, { code: a.code, html: a.html || '', timestamp: Date.now() }] };
        }),
      },
    }));
  },

  deleteArtifact: (artifactId) => {
    const threadId = get().activeThreadId;
    if (!threadId) return;
    set((s) => ({
      artifacts: {
        ...s.artifacts,
        [threadId]: (s.artifacts[threadId] || []).filter((a) => a.id !== artifactId),
      },
      activeArtifactId: s.activeArtifactId === artifactId ? null : s.activeArtifactId,
    }));
  },

  setActiveArtifact: (id) => set({ activeArtifactId: id }),

  setSplitPosition: (pos) => set({ splitPosition: pos }),

  setActiveAgent: (agent) => set({ activeAgent: agent }),

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  setArtifactOpen: (open) => set({ artifactOpen: open }),

  toggleArtifact: () => set((s) => ({ artifactOpen: !s.artifactOpen })),

  setLastDeployUrl: (url) => set({ lastDeployUrl: url }),

  hydrate: (threads, messages, artifacts) => {
    if (threads.length === 0) return;
    set({
      threads,
      messages,
      artifacts,
      activeThreadId: threads[0].id,
      activeArtifactId: (artifacts[threads[0].id]?.[0]?.id) ?? null,
    });
  },
}));
