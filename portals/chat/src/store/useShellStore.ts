import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Tab } from './useAppStore';

export type NotificationSource = 'mesh' | 'system' | 'assistant' | 'spoon' | 'love' | 'app';
export type NotificationPriority = 'low' | 'medium' | 'high';

export interface ShellNotification {
  id: string;
  source: NotificationSource;
  title: string;
  body: string;
  icon: string;
  priority: NotificationPriority;
  time: number;
  read: boolean;
  targetTab?: Tab;
}

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: { name: string; args: Record<string, unknown>; status: 'pending' | 'approved' | 'executed' | 'rejected' | 'error'; result?: unknown; error?: string }[];
  error?: boolean;
}

export type PocketCardTab = 'info' | 'welcome' | 'walkthrough' | 'troubleshooting' | 'dev';

interface ShellState {
  notifications: ShellNotification[];
  unreadCount: number;
  lastNotifPulse: number;
  optIns: Record<string, boolean>;
  threads: AssistantMessage[][];
  paletteOpen: boolean;
  assistantOpen: boolean;
  akinatorOpen: boolean;
  meshOpen: boolean;
  nodeZeroOpen: boolean;
  justiceOpen: boolean;
  sbtOpen: boolean;
  marketOpen: boolean;
  mcpOpen: boolean;
  dunaOpen: boolean;
  hubOpen: boolean;
  insightsOpen: boolean;
  sandboxOpen: boolean;
  streaming: boolean;
  pendingToolApproval: AssistantMessage['toolCalls'] | null;

  profileSubTab: 'identity' | 'wallet' | 'passport' | 'credentials';

  headerDrawerOpen: boolean;

  pocketCard: { pageKey: string | null; activeTab: PocketCardTab; position: { x: number; y: number } | null };

  localMode: boolean;
  localStatus: 'idle' | 'loading' | 'ready' | 'error';
  localProgress: number | null;
  assistantMode: 'auto' | 'local' | 'cloud';

  addNotification: (n: Omit<ShellNotification, 'id' | 'time' | 'read'>) => string;
  markRead: (id: string) => void;
  markAllRead: () => void;
  markSourceRead: (source: string) => void;
  clearAll: () => void;
  toggleOptIn: (key: string) => void;
  setPaletteOpen: (open: boolean) => void;
  setAssistantOpen: (open: boolean) => void;
  setAkinatorOpen: (open: boolean) => void;
  setMeshOpen: (open: boolean) => void;
  setNodeZeroOpen: (open: boolean) => void;
  setJusticeOpen: (open: boolean) => void;
  setSbtOpen: (open: boolean) => void;
  setMarketOpen: (open: boolean) => void;
  setMcpOpen: (open: boolean) => void;
  setDunaOpen: (open: boolean) => void;
  setHubOpen: (open: boolean) => void;
  setInsightsOpen: (open: boolean) => void;
  setSandboxOpen: (open: boolean) => void;
  appendMessage: (msg: AssistantMessage) => void;
  replaceLastMessage: (content: string) => void;
  clearThread: () => void;
  setStreaming: (streaming: boolean) => void;
  setPendingToolApproval: (tools: AssistantMessage['toolCalls'] | null) => void;
  setLocalMode: (mode: boolean) => void;
  setLocalStatus: (status: 'idle' | 'loading' | 'ready' | 'error') => void;
  setLocalProgress: (progress: number | null) => void;
  setAssistantMode: (mode: 'auto' | 'local' | 'cloud') => void;
  setHeaderDrawerOpen: (open: boolean) => void;
  toggleHeaderDrawer: () => void;
  setProfileSubTab: (tab: 'identity' | 'wallet' | 'passport' | 'credentials') => void;
  openPocketCard: (pageKey: string, tab?: PocketCardTab) => void;
  closePocketCard: () => void;
  setPocketCardTab: (tab: PocketCardTab) => void;
  setPocketCardPosition: (pos: { x: number; y: number }) => void;
}

export const useShellStore = create<ShellState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      lastNotifPulse: 0,
      optIns: { mesh: true, system: true, assistant: true, spoon: true, love: true, app: true },
      threads: [],
      paletteOpen: false,
      assistantOpen: false,
      akinatorOpen: false,
      meshOpen: false,
      nodeZeroOpen: false,
      justiceOpen: false,
      sbtOpen: false,
      marketOpen: false,
      mcpOpen: false,
      dunaOpen: false,
      hubOpen: false,
      insightsOpen: false,
      sandboxOpen: false,
      streaming: false,
      pendingToolApproval: null,
      profileSubTab: 'identity',
      localMode: false,
      localStatus: 'idle',
      localProgress: null,
      assistantMode: 'auto',
      headerDrawerOpen: false,
      pocketCard: { pageKey: null, activeTab: 'info', position: null },

      addNotification: (n) => {
        const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const notif: ShellNotification = { ...n, id, time: Date.now(), read: false };
        const optIn = get().optIns[n.source];
        if (optIn === false) return id;
        const existing = get().notifications.findIndex((x) => x.source === n.source && x.title === n.title);
        set((state) => {
          const base = existing >= 0
            ? state.notifications.map((x, i) => (i === existing ? { ...x, time: Date.now() } : x))
            : [notif, ...state.notifications];
          return {
            notifications: base.slice(0, 100),
            unreadCount: existing >= 0 ? state.unreadCount : state.unreadCount + 1,
            lastNotifPulse: n.priority === 'low' ? state.lastNotifPulse : Date.now(),
          };
        });
        return id;
      },

      markRead: (id) =>
        set((state) => {
          const target = state.notifications.find((n) => n.id === id);
          if (!target || target.read) return state;
          return {
            notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
            unreadCount: Math.max(0, state.unreadCount - 1),
          };
        }),

      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),

      markSourceRead: (source) =>
        set((state) => {
          const affected = state.notifications.filter((n) => !n.read && n.source === source);
          if (!affected.length) return state;
          return {
            notifications: state.notifications.map((n) => (n.source === source ? { ...n, read: true } : n)),
            unreadCount: Math.max(0, state.unreadCount - affected.length),
          };
        }),

      clearAll: () => set({ notifications: [], unreadCount: 0 }),

      toggleOptIn: (key) =>
        set((state) => ({ optIns: { ...state.optIns, [key]: !state.optIns[key] } })),

      setPaletteOpen: (open) => set({ paletteOpen: open }),
      setAssistantOpen: (open) => set({ assistantOpen: open }),
      setAkinatorOpen: (open) => set({ akinatorOpen: open }),
      setMeshOpen: (open) => set({ meshOpen: open }),
      setNodeZeroOpen: (open) => set({ nodeZeroOpen: open }),
      setJusticeOpen: (open) => set({ justiceOpen: open }),
      setSbtOpen: (open) => set({ sbtOpen: open }),
      setMarketOpen: (open) => set({ marketOpen: open }),
      setMcpOpen: (open) => set({ mcpOpen: open }),
      setDunaOpen: (open) => set({ dunaOpen: open }),
      setHubOpen: (open) => set({ hubOpen: open }),
      setInsightsOpen: (open) => set({ insightsOpen: open }),
      setSandboxOpen: (open) => set({ sandboxOpen: open }),

      appendMessage: (msg) =>
        set((state) => {
          const threads = [...state.threads];
          const last = threads.length ? threads[threads.length - 1] : [];
          threads[threads.length - 1] = [...last, msg];
          return { threads };
        }),

      replaceLastMessage: (content) =>
        set((state) => {
          const threads = [...state.threads];
          const last = threads.length ? [...threads[threads.length - 1]] : [];
          if (last.length) last[last.length - 1] = { ...last[last.length - 1], content };
          if (threads.length) threads[threads.length - 1] = last;
          return { threads };
        }),

      clearThread: () => set((state) => ({ threads: [...state.threads, []] })),

      setStreaming: (streaming) => set({ streaming }),
      setPendingToolApproval: (tools) => set({ pendingToolApproval: tools }),
      setLocalMode: (mode) => set({ localMode: mode }),
      setLocalStatus: (status) => set({ localStatus: status }),
      setLocalProgress: (progress) => set({ localProgress: progress }),
      setAssistantMode: (mode) => set({ assistantMode: mode }),
      setHeaderDrawerOpen: (open) => set({ headerDrawerOpen: open }),
      toggleHeaderDrawer: () => set((state) => ({ headerDrawerOpen: !state.headerDrawerOpen })),
      setProfileSubTab: (tab) => set({ profileSubTab: tab }),
      openPocketCard: (pageKey, tab = 'info') => set({ pocketCard: { pageKey, activeTab: tab, position: null } }),
      closePocketCard: () => set((state) => ({ pocketCard: { ...state.pocketCard, pageKey: null } })),
      setPocketCardTab: (activeTab) => set((state) => ({ pocketCard: { ...state.pocketCard, activeTab } })),
      setPocketCardPosition: (position) => set((state) => ({ pocketCard: { ...state.pocketCard, position } })),
    }),
    {
      name: 'p31-shell-storage',
      partialize: (state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        optIns: state.optIns,
      }),
    }
  )
);
