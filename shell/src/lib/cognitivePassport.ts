import { getOrCreateDidKey, getEd25519PubKeyB64 } from './identity';
import { getMldsa65PubKeyB64, getSlhdsa128sPubKeyB64 } from './pqc';
import { useAppStore } from '../store/useAppStore';
import { getLoveWallet } from './loveEngine';
import { getKEL } from './keri';
import {
  type CognitivePassportLive,
  type PassportSbt,
  PASSPORT_SCHEMA_VERSION,
} from './cognitivePassport.schema';

export type { UnifiedCognitivePassport, CognitivePassportLive, PassportSbt, mergePassport } from './cognitivePassport.schema';

const STORAGE_KEY = 'p31-cognitive-passport';
const CACHE_TTL = 60_000;

let cachedPassport: CognitivePassportLive | null = null;
let cacheTimestamp = 0;

export async function buildPassport(forceRefresh = false): Promise<CognitivePassportLive> {
  if (!forceRefresh && cachedPassport && (Date.now() - cacheTimestamp) < CACHE_TTL) {
    return cachedPassport;
  }

  const did = await getOrCreateDidKey();
  const ed25519 = (await getEd25519PubKeyB64()) ?? '—';
  const mldsa65 = (await getMldsa65PubKeyB64().catch(() => null)) ?? undefined;
  const slhdsa128s = (await getSlhdsa128sPubKeyB64().catch(() => null)) ?? undefined;
  const profile = useAppStore.getState().profile;
  const sbts: PassportSbt[] = (profile?.sbts || []).map((sbt: any) => ({
    id: sbt.id,
    type: sbt.type,
    issuedAt: sbt.issuedAt,
  }));
  const spoons = useAppStore.getState().spoons || 0;
  const wallet = getLoveWallet();
  const kel = await getKEL();
  const r = (typeof window !== 'undefined' && (window as any).__p31_kura?.r) ?? 0;
  const phase = r > 0.7 ? 'full' : r > 0.4 ? 'mid' : 'low';
  const mode = r > 0.7 ? 'wye' : 'delta';

  const passport: CognitivePassportLive = {
    version: PASSPORT_SCHEMA_VERSION,
    did,
    keys: { ed25519, mldsa65, slhdsa128s },
    sbts,
    cognitive: {
      spoons,
      r,
      phase,
      mode,
      careScore: wallet.careScore,
    },
    love: {
      sovereignty: wallet.sovereigntyPool,
      performance: wallet.availableBalance,
      frozen: wallet.frozenBalance,
    },
    kel: {
      count: kel?.events?.length || 0,
      latestSaid: kel?.events?.slice(-1)[0]?.said,
    },
    updatedAt: new Date().toISOString(),
  };

  cachedPassport = passport;
  cacheTimestamp = Date.now();

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(passport));
    }
  } catch {
    // private mode or storage full
  }

  return passport;
}

export function loadCachedPassport(): CognitivePassportLive | null {
  if (cachedPassport) return cachedPassport;
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CognitivePassportLive;
        cachedPassport = parsed;
        cacheTimestamp = Date.now();
        return parsed;
      }
    }
  } catch {
    // corrupt or unavailable
  }
  return null;
}
