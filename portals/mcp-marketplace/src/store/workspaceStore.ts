import { create } from 'zustand'
import type { Mode, SpoonLevel, SurfaceId } from '@/types'
import { createIdentity, loadAllIdentities, loadIdentity, type Identity } from '@/lib/identity'

const PIN_KEY = 'p31:caregiver-pin'
const STARFIELD_KEY = 'p31:starfield-config'
const PROFILE_KEY = 'p31:profile:v1'
const ACTIVE_MEMBER_KEY = 'p31:active-member:v1'
export const DEFAULT_CAREGIVER_PIN = '1234'

/** Per-member profile override — only the fields the member customized. */
export interface ProfileOverride {
  emoji?: string
  pickleSeed?: string
  greetingName?: string
  accent?: string
  theme?: { world: string; age: string; muted: boolean; warmLight: boolean }
  spoonsBaseline?: SpoonLevel
}

export type ProfileMap = Record<string, ProfileOverride | undefined>

export interface StarfieldConfig {
  count: number
  seed: number
  twinkleSpeed: number
  flareCount: number
  flaring: boolean
}

export const DEFAULT_STARFIELD: StarfieldConfig = {
  count: 140,
  seed: 182332,
  twinkleSpeed: 1,
  flareCount: 6,
  flaring: true,
}

function loadStarfieldConfig(): StarfieldConfig {
  try {
    const stored = localStorage.getItem(STARFIELD_KEY)
    if (stored) return { ...DEFAULT_STARFIELD, ...(JSON.parse(stored) as Partial<StarfieldConfig>) }
  } catch {
    /* storage unavailable — use defaults */
  }
  return DEFAULT_STARFIELD
}

function loadPin(): { pin: string; set: boolean } {
  try {
    const stored = localStorage.getItem(PIN_KEY)
    if (stored && stored.length === 4) return { pin: stored, set: true }
  } catch {
    /* storage unavailable — use the default */
  }
  return { pin: DEFAULT_CAREGIVER_PIN, set: false }
}

function loadProfileMap(): ProfileMap {
  try {
    const stored = localStorage.getItem(PROFILE_KEY)
    if (stored) return JSON.parse(stored) as ProfileMap
  } catch {
    /* storage unavailable — start empty */
  }
  return {}
}

function loadActiveMember(): string {
  try {
    const stored = localStorage.getItem(ACTIVE_MEMBER_KEY)
    if (stored) return stored
  } catch {
    /* storage unavailable — use first roster slot */
  }
  return 'caregiver-one'
}

interface WorkspaceState {
  surface: SurfaceId
  mode: Mode
  spoons: SpoonLevel
  crisis: boolean
  gateOpen: boolean
  pendingSurface: SurfaceId | null
  paletteOpen: boolean

  // Caregiver PIN (persisted) + session PQC capability token.
  caregiverPin: string
  caregiverPinSet: boolean
  sessionToken: string | null
  tokenFingerprint: string | null
  tokenMintedAt: number | null
  starfield: StarfieldConfig
  devOpen: boolean

  // Sovereign identity per family member + forge usage counter (SBT triggers).
  identities: Record<string, Identity>
  identityStatus: Record<string, 'none' | 'ready'>
  docsForged: number

  // Profile — who is acting + per-member customization (persisted, v1).
  activeMemberId: string
  profiles: ProfileMap

  setSurface: (s: SurfaceId) => void
  elevate: (m: Mode) => void
  setSpoons: (n: SpoonLevel) => void
  setCalm: (calm: boolean) => void
  openGate: (s: SurfaceId) => void
  closeGate: () => void
  togglePalette: () => void
  closePalette: () => void

  // PIN + token actions.
  setCaregiverPin: (pin: string) => void
  setSessionToken: (token: string, fingerprint: string) => void
  clearSessionToken: () => void
  setStarfield: (config: Partial<StarfieldConfig>) => void
  reseedStarfield: () => void
  setDevOpen: (open: boolean) => void
  setActiveMember: (id: string) => void
  updateProfile: (id: string, patch: ProfileOverride) => void
  resetProfile: (id: string) => void
  claimIdentity: (memberId: string, avatar: string, accent: string) => Promise<Identity>
  markDocsForged: () => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  surface: 'home',
  mode: 'spark',
  spoons: 4,
  crisis: false,
  gateOpen: false,
  pendingSurface: null,
  paletteOpen: false,

  caregiverPin: loadPin().pin,
  caregiverPinSet: loadPin().set,
  sessionToken: null,
  tokenFingerprint: null,
  tokenMintedAt: null,
  starfield: loadStarfieldConfig(),
  devOpen: false,
  activeMemberId: loadActiveMember(),
  profiles: loadProfileMap(),
  identities: loadAllIdentities(),
  identityStatus: Object.fromEntries(Object.keys(loadAllIdentities()).map((id) => [id, 'ready'])) as Record<string, 'none' | 'ready'>,
  docsForged: 0,

  setSurface: (surface) => set({ surface }),
  elevate: (mode) => set({ mode }),
  setSpoons: (spoons) => set({ spoons }),
  setCalm: (calm) => set({ crisis: calm, spoons: calm ? 0 : 4 }),
  openGate: (pendingSurface) => set({ gateOpen: true, pendingSurface }),
  closeGate: () => set({ gateOpen: false, pendingSurface: null }),
  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),
  closePalette: () => set({ paletteOpen: false }),

  setCaregiverPin: (pin) => {
    try {
      localStorage.setItem(PIN_KEY, pin)
    } catch {
      /* storage unavailable — still set in memory */
    }
    set({ caregiverPin: pin, caregiverPinSet: true })
  },
  setSessionToken: (token, fingerprint) =>
    set({ sessionToken: token, tokenFingerprint: fingerprint, tokenMintedAt: Date.now() }),
  clearSessionToken: () => set({ sessionToken: null, tokenFingerprint: null, tokenMintedAt: null }),
  setStarfield: (config) => {
    const next = { ...loadStarfieldConfig(), ...config }
    try {
      localStorage.setItem(STARFIELD_KEY, JSON.stringify(next))
    } catch {
      /* storage unavailable */
    }
    set({ starfield: next })
  },
  reseedStarfield: () => {
    const seed = Math.floor(Math.random() * 1_000_000)
    set((s) => {
      const next = { ...s.starfield, seed }
      try {
        localStorage.setItem(STARFIELD_KEY, JSON.stringify(next))
      } catch {
        /* storage unavailable */
      }
      return { starfield: next }
    })
  },
  setDevOpen: (open) => set({ devOpen: open }),
  setActiveMember: (id) => {
    try {
      localStorage.setItem(ACTIVE_MEMBER_KEY, id)
    } catch {
      /* storage unavailable — still switch in memory */
    }
    set({ activeMemberId: id })
  },
  updateProfile: (id, patch) => {
    const next = { ...loadProfileMap(), [id]: { ...(loadProfileMap()[id] ?? {}), ...patch } }
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(next))
    } catch {
      /* storage unavailable — keep in memory */
    }
    set({ profiles: next })
  },
  resetProfile: (id) => {
    const next = { ...loadProfileMap() }
    delete next[id]
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(next))
    } catch {
      /* storage unavailable — keep in memory */
    }
    set({ profiles: next })
  },
  claimIdentity: async (memberId, avatar, accent) => {
    const existing = loadIdentity(memberId)
    if (existing) return existing
    const identity = await createIdentity(memberId, { avatar, accent })
    set((s) => ({
      identities: { ...s.identities, [memberId]: identity },
      identityStatus: { ...s.identityStatus, [memberId]: 'ready' },
    }))
    return identity
  },
  markDocsForged: () => set((s) => ({ docsForged: s.docsForged + 1 })),
}))