import { create } from 'zustand'

import { applyEvent } from './lib/chat'
import type { ChatMessage, ServerEvent } from './types'

export const SPOONS_KEY = 'chat:spoons'

interface ChatState {
  messages: ChatMessage[]
  members: number
  connected: boolean
  connecting: boolean
  spoons: number
  setSpoons: (n: number) => void
  applyEvent: (evt: ServerEvent) => void
  setConnected: (connected: boolean) => void
}

function readSpoons(): number {
  if (typeof localStorage === 'undefined') return 3;
  const parsed = Number(localStorage.getItem(SPOONS_KEY))
  return Number.isFinite(parsed) ? Math.max(0, Math.min(5, Math.round(parsed))) : 3
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  members: 1,
  connected: false,
  connecting: true,
  spoons: readSpoons(),
  setSpoons: (n) => {
    const next = Math.max(0, Math.min(5, Math.round(n)))
    if (typeof localStorage !== 'undefined') localStorage.setItem(SPOONS_KEY, String(next))
    set({ spoons: next })
  },
  applyEvent: (evt) => {
    set((s) => ({
      messages: applyEvent(s.messages, evt),
      members: evt.type === 'presence' || evt.type === 'welcome' ? evt.members ?? s.members : s.members,
    }))
  },
  setConnected: (connected) => set({ connected, connecting: false }),
}))