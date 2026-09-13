import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { HeartbeatMesh, type MeshState } from '@p31/sovereign-core';
import type { Preferences } from '@p31/sovereign-core';
import type { Identity, IdentityStatus } from '../lib/identity';
import { useNotifStore } from './useNotifStore';
import {
  initialLove,
  warmedCareScore,
  careGatedAmount,
  splitEarn,
  pruneLoveLog,
  roundTrunc,
  decayedCareScore,
  LOVE_WEIGHTS,
  type LoveEntry,
  type LoveSource,
  type LoveState,
} from '../lib/love';
import {
  PASSENGER_IDS,
  MODE_RANK,
  clampSpoons,
  defaultModeFor,
  getPassport,
  type PassportId,
  type PortalMode,
} from '../lib/passports';
import type { WorkshopLevel } from '../lib/workshopLevels';
import { advanceLevel } from '../lib/workshopLevels';

export interface TalkMessage {
  id: string;
  from: PassportId;
  kind: 'text' | 'voice' | 'system';
  body: string;
  sentAt: number;
}

export interface PresenceNode {
  did: string;
  online: boolean;
  mood?: string | null;
  spoons?: number;
  verified?: boolean;
  lastSeen: number;
}

export interface Toast {
  message: string;
  type?: 'success' | 'error' | 'info';
}

export const DEFAULT_SPOONS = 3;
export const DEFAULT_CAREGIVER_PIN = '1234';
export type QpjTheme = 'space' | 'lantern';
const STORAGE_KEY = 'qpj:store';

let msgSeq = 0;
function nextMsgId(): string {
  msgSeq += 1;
  return `m${Date.now()}-${msgSeq}`;
}

let loveSeq = 0;
function nextLoveId(): string {
  loveSeq += 1;
  return `L${Date.now()}-${loveSeq}`;
}

type MeshStatus = 'idle' | 'connecting' | 'online' | 'error';

export interface QpjState {
  passportId: PassportId;
  mode: PortalMode;
  spoons: number;
  /** @deprecated — Chameleon theme store (design-core) is the source of truth for palette/theme. Kept as a no-op for one release; removed in the DID onboarding commit. */
  darkMode: boolean;
  reduceMotion: boolean;
  soundEffects: boolean;
  treatsReceived: number;
  love: LoveState;
  caregiverPin: string;
  caregiverPinSet: boolean;
  qpjTheme: QpjTheme;
  presenceRoom: string;
  mood: string | null;
  motionScale: number;
  soundScale: number;
  contrastTarget: 'AA' | 'AAA' | 'APCA-60' | 'APCA-75';
  density: 'comfortable' | 'compact';
  breathPattern: '4-4-6' | '5-5-5' | '4-7-8';
  zeitgeber: { tone: boolean; freq: 863 | 172.35 };
  spoonQuadrants: [number, number, number, number];
  toast: Toast | null;
  identity: IdentityStatus;
  talkTarget: PassportId | 'family';
  talkMessages: TalkMessage[];
  meshInstance: HeartbeatMesh | null;
  meshStatus: MeshStatus;
  meshUniform: Pick<MeshState, 'symmetry' | 'curvature' | 'topology'>;
  presence: Record<PassportId, PresenceNode>;
  meshSeen: boolean;
  hasUnlockedMode: boolean;
  badgeDone: boolean;
  onboardingChecklistDismissed: boolean;
  workshopLevel: WorkshopLevel;

  setPassport: (id: PassportId) => void;
  setMode: (mode: PortalMode) => void;
  setSpoons: (level: number) => void;
  setDarkMode: (enabled: boolean) => void;
  setReduceMotion: (enabled: boolean) => void;
  setSoundEffects: (enabled: boolean) => void;
  setMood: (mood: string | null) => void;
  setMotionScale: (v: number) => void;
  setSoundScale: (v: number) => void;
  setContrastTarget: (v: 'AA' | 'AAA' | 'APCA-60' | 'APCA-75') => void;
  setDensity: (v: 'comfortable' | 'compact') => void;
  setBreathPattern: (v: '4-4-6' | '5-5-5' | '4-7-8') => void;
  setZeitgeber: (v: { tone?: boolean; freq?: 863 | 172.35 }) => void;
  setSpoonQuadrants: (v: [number, number, number, number]) => void;
  hydrateSensory: (prefs: Partial<Preferences>) => void;
  showToast: (message: string, type?: Toast['type']) => void;
  clearToast: () => void;
  setCaregiverPin: (pin: string) => void;
  setQpjTheme: (theme: QpjTheme) => void;
  setIdentity: (passportId: PassportId, identity: Identity) => void;
  setIdentityStatus: (passportId: PassportId, status: IdentityStatus['status']) => void;
  setWorkshopLevel: (level: WorkshopLevel) => void;
  advanceWorkshopLevel: () => void;
  addTreats: (n: number) => void;
  restartDay: () => void;
  setTalkTarget: (target: PassportId | 'family') => void;
  pushTalk: (message: Omit<TalkMessage, 'id' | 'sentAt'>) => void;
  clearTalk: () => void;
  setMeshInstance: (instance: HeartbeatMesh | null) => void;
  updatePresence: (nodes: Record<PassportId, PresenceNode>) => void;
  initMesh: (passportId: PassportId) => Promise<void>;
  disconnectMesh: () => void;
  dismissOnboardingChecklist: () => void;
  markBadgeDone: () => void;
  earnLove: (source: LoveSource, by: string) => void;
  spendLove: (amount: number, to?: string) => void;
}

const seedPresence = (): Record<PassportId, PresenceNode> => {
  const nodes: Record<PassportId, PresenceNode> = {};
  for (const id of PASSENGER_IDS) {
    nodes[id] = { did: `qpj:${id}:seed`, online: false, lastSeen: 0 };
  }
  return nodes;
};

/**
 * Merges persisted state back into the app default.
 *
 * Security note: a persisted random caregiver PIN means a family whose PIN was
 * set before the factory-default change would stay locked out — so unless the
 * PIN was explicitly set by the caregiver (`caregiverPinSet`), it is always
 * reset to the factory default on boot.
 */
export function mergePersistedQpj(persisted: unknown, current: QpjState): QpjState {
  const p = (persisted ?? {}) as Partial<QpjState>;
  return {
    ...current,
    ...p,
    mode: defaultModeFor(p.passportId ?? current.passportId),
    caregiverPin: p.caregiverPinSet ? (p.caregiverPin ?? DEFAULT_CAREGIVER_PIN) : DEFAULT_CAREGIVER_PIN,
    caregiverPinSet: Boolean(p.caregiverPinSet),
    qpjTheme: p.qpjTheme === 'lantern' ? 'lantern' : 'space',
    toast: null,
    identity: { status: 'unknown', identity: null },
    talkTarget: 'family' as const,
    talkMessages: (p.passportId === current.passportId && p.talkMessages)
      ? p.talkMessages
      : [] as TalkMessage[],
    meshInstance: null,
    meshStatus: 'idle' as MeshStatus,
    meshUniform: { symmetry: 1, curvature: 0, topology: 'isolated' },
    presence: seedPresence(),
  };
}

export const useQpjStore = create<QpjState>()(
  persist(
    (set, get) => ({
      passportId: 'dillpickle',
      mode: defaultModeFor('dillpickle'),
      spoons: DEFAULT_SPOONS,
      darkMode: false,
      reduceMotion: false,
      soundEffects: true,
      treatsReceived: 0,
      caregiverPin: DEFAULT_CAREGIVER_PIN,
      caregiverPinSet: false,
      qpjTheme: 'space',
      identity: { status: 'unknown', identity: null },
      love: initialLove(),
      presenceRoom: 'garden.lane',
      mood: null,
      motionScale: 1,
      soundScale: 0.6,
      contrastTarget: 'AA',
      density: 'comfortable',
      breathPattern: '4-4-6',
      zeitgeber: { tone: false, freq: 863 },
      spoonQuadrants: [3, 3, 3, 3],
      toast: null,
      talkTarget: 'family',
      talkMessages: [],
      meshInstance: null,
      meshStatus: 'idle',
      meshUniform: { symmetry: 1, curvature: 0, topology: 'isolated' },
      presence: seedPresence(),
      meshSeen: false,
      hasUnlockedMode: false,
      badgeDone: false,
      onboardingChecklistDismissed: false,
      workshopLevel: 0 as WorkshopLevel,

      setPassport: (id) => {
        const state = get();

        if (state.meshInstance) {
          state.meshInstance.disconnect();
        }

        set({
          passportId: id,
          mode: defaultModeFor(id),
          spoons: DEFAULT_SPOONS,
          talkTarget: 'family',
          talkMessages: [],
          meshInstance: null,
          meshStatus: 'idle',
          presence: seedPresence(),
          identity: { status: 'none', identity: null },
        });
      },

      setMode: (mode) =>
        set((state) => {
          const defaultRank = MODE_RANK[defaultModeFor(state.passportId)];
          return MODE_RANK[mode] > defaultRank
            ? { mode, hasUnlockedMode: true }
            : { mode };
        }),
      dismissOnboardingChecklist: () => set({ onboardingChecklistDismissed: true }),
      markBadgeDone: () => set({ badgeDone: true }),
      setWorkshopLevel: (level: WorkshopLevel) => set({ workshopLevel: level }),
      advanceWorkshopLevel: () =>
        set((state) => {
          const level = advanceLevel(state.workshopLevel, {
            artifactsBuilt: 0,
            tokensUsed: 0,
            sbtsMinted: state.badgeDone ? 1 : 0,
            buildsCompleted: 0,
          });
          return level !== state.workshopLevel ? { workshopLevel: level } : {};
        }),
      setSpoons: (level) => set({ spoons: clampSpoons(level) }),
      setDarkMode: (darkMode) => set({ darkMode }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setSoundEffects: (soundEffects) => set({ soundEffects }),
      setMood: (mood) => set({ mood }),
      setMotionScale: (v) => set({ motionScale: Math.max(0, Math.min(1.5, v)) }),
      setSoundScale: (v) => set({ soundScale: Math.max(0, Math.min(1, v)) }),
      setContrastTarget: (v) => set({ contrastTarget: v }),
      setDensity: (v) => set({ density: v }),
      setBreathPattern: (v) => set({ breathPattern: v }),
      setZeitgeber: (v) =>
        set((s) => ({ zeitgeber: { ...s.zeitgeber, ...v } })),
      setSpoonQuadrants: (v) => set({ spoonQuadrants: v }),
      hydrateSensory: (prefs) =>
        set({
          ...(prefs.motionScale !== undefined && { motionScale: prefs.motionScale }),
          ...(prefs.soundScale !== undefined && { soundScale: prefs.soundScale }),
          ...(prefs.contrastTarget !== undefined && { contrastTarget: prefs.contrastTarget }),
          ...(prefs.density !== undefined && { density: prefs.density }),
          ...(prefs.breathPattern !== undefined && { breathPattern: prefs.breathPattern }),
          ...(prefs.zeitgeber !== undefined && { zeitgeber: prefs.zeitgeber }),
          ...(prefs.spoonQuadrants !== undefined && { spoonQuadrants: prefs.spoonQuadrants }),
          ...(prefs.motionScale !== undefined && { reduceMotion: prefs.motionScale < 0.5 }),
          ...(prefs.soundScale !== undefined && { soundEffects: prefs.soundScale > 0 }),
        }),

      showToast: (message, type = 'info') => {
        set({ toast: { message, type } });
        window.setTimeout(() => {
          const current = get().toast;
          if (current && current.message === message) {
            set({ toast: null });
          }
        }, 3600);
      },
      clearToast: () => set({ toast: null }),

      setCaregiverPin: (pin) =>
        set({
          caregiverPin: pin.length === 4 && /^\d{4}$/.test(pin) ? pin : get().caregiverPin,
          caregiverPinSet: pin.length === 4 && /^\d{4}$/.test(pin),
        }),
      setQpjTheme: (qpjTheme) => set({ qpjTheme }),

      setIdentity: (_passportId, identity) =>
        set(() => ({
          identity: { status: 'ready', identity },
        })),
      setIdentityStatus: (passportId, status) =>
        set((state) => ({
          identity: { ...state.identity, status, identity: state.identity.identity },
        })),

      addTreats: (n) =>
        set((state) => ({ treatsReceived: state.treatsReceived + Math.max(0, n) })),
      earnLove: (source: LoveSource, by: string) =>
        set((state) => {
          const now = Date.now();
          const love = state.love;
          const score = decayedCareScore(love.careScore, love.lastCareAt, now);
          const gated = careGatedAmount(LOVE_WEIGHTS[source], score);
          const { sovereignty, performance } = splitEarn(gated);
          const entry: LoveEntry = {
            id: nextLoveId(),
            at: now,
            kind: 'earn',
            source,
            amount: roundTrunc(gated),
            by,
          };
          return {
            love: {
              sovereignty: roundTrunc(love.sovereignty + sovereignty),
              performance: roundTrunc(love.performance + performance),
              careScore: warmedCareScore(score),
              lastCareAt: now,
              log: pruneLoveLog([...love.log, entry]),
            },
          };
        }),
      spendLove: (amount: number, to?: string) =>
        set((state) => {
          const spend = Math.min(Math.max(0, amount), state.love.performance);
          if (spend === 0) return {};
          const now = Date.now();
          const entry: LoveEntry = {
            id: nextLoveId(),
            at: now,
            kind: 'spend',
            source: 'care',
            amount: roundTrunc(-spend),
            by: getPassport(state.passportId).pickledName,
            to,
          };
          return {
            love: {
              ...state.love,
              performance: roundTrunc(state.love.performance - spend),
              lastCareAt: now,
              log: pruneLoveLog([...state.love.log, entry]),
            },
          };
        }),
      restartDay: () =>
        set(() => ({
          spoons: DEFAULT_SPOONS,
          treatsReceived: 0,
          talkTarget: 'family',
          talkMessages: [],
        })),

      setTalkTarget: (talkTarget) => set({ talkTarget }),
      pushTalk: (message) => {
        const next: TalkMessage = { ...message, id: nextMsgId(), sentAt: Date.now() };
        set((s) => ({ talkMessages: [...s.talkMessages.slice(-60), next] }));
      },
      clearTalk: () => set({ talkMessages: [] }),

      setMeshInstance: (meshInstance) => set({ meshInstance }),
      updatePresence: (presence) => set({ presence }),

      initMesh: async (passportId) => {
        const state = get();
        if (state.meshStatus === 'connecting' || state.meshStatus === 'online') return;
        if (typeof window === 'undefined') return;

        const passport = getPassport(passportId);
        const did = `qpj:${passportId}:${state.presenceRoom.replace(/[^a-z0-9.-]/gi, '')}`;
        set({ meshStatus: 'connecting' });

        const mesh = new HeartbeatMesh(did, (meshState) => {
          const nodes: Record<PassportId, PresenceNode> = { ...get().presence };
          meshState.nodes.forEach((node) => {
            const pid = node.did.split(':')[1];
            if (pid && PASSENGER_IDS.includes(pid)) {
              nodes[pid] = {
                did: node.did,
                online: true,
                mood: node.mood ?? null,
                spoons: node.spoons,
                verified: node.verified,
                lastSeen: node.lastSeen,
              };
            }
          });
          set({
            presence: nodes,
            meshUniform: {
              symmetry: meshState.symmetry,
              curvature: meshState.curvature,
              topology: meshState.topology,
            },
          });
        });

        const existing = get().meshInstance;
        const prevInstance = existing && existing !== mesh ? existing : null;

        try {
          await mesh.connect();
          if (prevInstance) {
            prevInstance.disconnect();
          }
          set({ meshInstance: mesh, meshStatus: 'online', meshSeen: true });
          useNotifStore.getState().notify({
            kind: 'success',
            title: `${passport.pickledName} joined the street`,
            burst: true,
          });
          get().earnLove('mesh', passport.pickledName);
        } catch {
          mesh.disconnect();
          set({ meshInstance: null, meshStatus: 'error' });
        }
      },

      disconnectMesh: () => {
        const state = get();
        if (state.meshInstance) {
          state.meshInstance.disconnect();
        }
        set({ meshInstance: null, meshStatus: 'idle', presence: seedPresence() });
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: (state) => ({
        passportId: state.passportId,
        spoons: state.spoons,
        darkMode: state.darkMode,
        reduceMotion: state.reduceMotion,
        soundEffects: state.soundEffects,
        treatsReceived: state.treatsReceived,
        caregiverPin: state.caregiverPin,
        caregiverPinSet: state.caregiverPinSet,
        qpjTheme: state.qpjTheme,
        identity: state.identity,
        talkMessages: state.talkMessages,
        presenceRoom: state.presenceRoom,
        mood: state.mood,
        meshSeen: state.meshSeen,
        hasUnlockedMode: state.hasUnlockedMode,
        badgeDone: state.badgeDone,
        onboardingChecklistDismissed: state.onboardingChecklistDismissed,
        workshopLevel: state.workshopLevel,
        love: state.love,
      }),
      merge: (persisted, current) => mergePersistedQpj(persisted, current),
    }
  )
);