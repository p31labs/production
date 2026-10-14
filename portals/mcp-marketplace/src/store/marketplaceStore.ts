import { create } from 'zustand'
import type { ServerSummary, ServerDetail, CategoryCount, SessionEvent, MeResponse, Lens, ExternalProbeResult } from '@/types'
import { listServers, getServer, getCategories, getMe } from '@/lib/registryClient'
import { humanError } from '@/lib/humanErrors'
import type { PlaygroundSnapshot } from '@/lib/snapshot'

const LENS_KEY = 'p31:mcp:lens'

/** Pseudo-ID for the inspected external server in the playground (B-2). */
export const EXTERNAL_SERVER_ID = '__external__'

function loadLens(): Lens {
  try {
    const v = localStorage.getItem(LENS_KEY)
    if (v === 'governed' || v === 'public') return v
  } catch {
    /* storage unavailable */
  }
  return 'public'
}

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

  /** Dual lens (B-3). Governed shows approvals/private/analytics/publish. */
  lens: Lens
  setLens: (l: Lens) => void

  /** Inspect-any-URL (B-2): the last external probe (ad-hoc storefront). */
  externalProbe: ExternalProbeResult | null
  setExternalProbe: (p: ExternalProbeResult | null) => void

  /** Snapshot restore (C-3): state handed to the playground after import. */
  snapshotState: { result?: unknown; error?: string; args?: Record<string, unknown> } | null
  restoreSnapshot: (s: PlaygroundSnapshot) => void
  clearSnapshotState: () => void

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
  importSession: (events: SessionEvent[]) => void
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
  lens: loadLens(),
  externalProbe: null,
  snapshotState: null,

  setLens: (lens) => {
    try {
      localStorage.setItem(LENS_KEY, lens)
    } catch {
      /* storage unavailable — still switch in memory */
    }
    set({ lens })
  },
  setExternalProbe: (externalProbe) => set({ externalProbe }),

  restoreSnapshot: (s) => {
    set({
      selectedServerId: s.state.serverId ?? null,
      selectedTool: s.state.tool ?? null,
      session: s.session,
      snapshotState: s.state.result !== undefined || s.state.error
        ? { result: s.state.result, error: s.state.error, args: s.state.args }
        : null,
    })
  },
  clearSnapshotState: () => set({ snapshotState: null }),

  refresh: async () => {
    set({ loading: true, error: null })
    try {
      const [servers, categories] = await Promise.all([listServers(), getCategories()])
      set({ servers, categories, loading: false, loadedAt: Date.now() })
    } catch (e: unknown) {
      set({ loading: false, error: humanError(e instanceof Error ? e.message : String(e)) })
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
  importSession: (events) => set((s) => ({ session: [...events, ...s.session].slice(0, 200) })),
}))