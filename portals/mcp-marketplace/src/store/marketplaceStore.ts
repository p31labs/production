import { create } from 'zustand'
import type { ServerSummary, ServerDetail, CategoryCount, SessionEvent, MeResponse } from '@/types'
import { listServers, getServer, getCategories, getMe } from '@/lib/registryClient'

interface MarketplaceState {
  servers: ServerSummary[]
  categories: CategoryCount[]
  loading: boolean
  loadedAt: number | null
  error: string | null
  me: MeResponse | null

  selectedServerId: string | null
  serverDetail: ServerDetail | null
  selectedTool: string | null

  search: string
  categoryFilter: string
  statusFilter: string

  session: SessionEvent[]

  refresh: () => Promise<void>
  loadMe: () => Promise<void>
  loadServer: (id: string) => Promise<void>
  clearServer: () => void
  setSearch: (q: string) => void
  setCategoryFilter: (c: string) => void
  setStatusFilter: (s: string) => void
  selectTool: (t: string | null) => void
  pushSession: (e: SessionEvent) => void
  updateSession: (id: string, patch: Partial<SessionEvent>) => void
  clearSession: () => void
}

export const useMarketplaceStore = create<MarketplaceState>((set) => ({
  servers: [],
  categories: [],
  loading: false,
  loadedAt: null,
  error: null,
  me: null,
  selectedServerId: null,
  serverDetail: null,
  selectedTool: null,
  search: '',
  categoryFilter: 'all',
  statusFilter: 'all',
  session: [],

  refresh: async () => {
    set({ loading: true, error: null })
    try {
      const [servers, categories] = await Promise.all([listServers(), getCategories()])
      set({ servers, categories, loading: false, loadedAt: Date.now() })
    } catch (e: unknown) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) })
    }
  },

  loadMe: async () => {
    const me = await getMe()
    set({ me })
  },

  loadServer: async (id: string) => {
    const detail = await getServer(id)
    set({ selectedServerId: id, serverDetail: detail })
  },

  clearServer: () => set({ selectedServerId: null, serverDetail: null, selectedTool: null }),

  setSearch: (search) => set({ search }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  selectTool: (selectedTool) => set({ selectedTool }),

  pushSession: (e) => set((s) => ({ session: [e, ...s.session].slice(0, 200) })),
  updateSession: (id, patch) =>
    set((s) => ({ session: s.session.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
  clearSession: () => set({ session: [] }),
}))