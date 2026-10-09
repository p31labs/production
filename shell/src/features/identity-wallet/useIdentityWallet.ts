// useIdentityWallet — the single data-layer hook behind the Phenix Identity
// Wallet. Combines DID/keys/KEL, LOVE wallet, Cognitive Passport, trust score,
// mesh status, and bonding state into one reactive source for the profile page
// and its tabs (Identity / Wallet / Passport / Credentials).

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  getOrCreateDidKey,
  getEd25519PubKeyB64,
  signWithDid,
} from '../../lib/identity';
import { isPqcReady, getMldsa65PubKeyB64, getOrCreatePqcKey, isSlhdsaReady, getSlhdsa128sPubKeyB64, getOrCreateSlhdsaKey } from '../../lib/pqc';
import { getKEL, type KelEvent } from '../../lib/keri';
import {
  getLoveWallet,
  getLoveTransactions,
  subscribeLoveEngine,
} from '../../lib/loveEngine';
import type { LoveWallet, LoveTransaction } from '@p31ca/love-ledger';
import { getBondingState, subscribeBonding } from '../bonding/bondingState';
import { useMeshPeers } from '../../hooks/useMeshPeers';
import { useMeshStatus, type MeshStatusData } from '../../components/MeshStatusIndicator';
import { useKuramotoOrderParameter } from '../../hooks/useKuramotoOrderParameter';
import { computeTrustScore, type TrustScore } from './computeTrustScore';
import {
  type UnifiedCognitivePassport,
  type CognitivePassportLive,
  mergePassport,
} from '../../lib/cognitivePassport.schema';
import { buildPassport } from '../../lib/cognitivePassport';
import { buildOAuthUrl, generateState, getOAuthSession, clearOAuthSession, startOAuthFlowPAR } from '../../lib/oauth';

export interface IdentityWalletState {
  loading: boolean;
  did: string;
  edPub: string | null;
  mldsaPub: string | null;
  slhdsaPub: string | null;
  slhdsaReady: boolean;
  pqcReady: boolean;
  kelEvents: KelEvent[] | null;
  kelValid: boolean;
  kelCount: number;
  kelLatestSaid: string | undefined;

  loveWallet: LoveWallet;
  loveTransactions: LoveTransaction[];
  careScore: number;

  passport: UnifiedCognitivePassport | null;
  livePassport: CognitivePassportLive | null;

  trust: TrustScore;
  credentialCount: number;

  meshPeers: number;
  meshStatus: MeshStatusData;
  r: number;
  phase: 'low' | 'mid' | 'full';
  mode: 'wye' | 'delta';
  spoons: number;
  bondingRitualsCompleted: number;
  bondingLoveDelta: number;

  refresh: () => Promise<void>;
  sign: (message: string) => Promise<string | null>;
  ensurePqc: () => Promise<void>;
  ensureSlhdsa: () => Promise<void>;
  oauthProvider: string | null;
  oauthLinked: boolean;
  oauthLogin: (provider: 'google' | 'github') => void;
  oauthLogout: () => void;
}

export function useIdentityWallet(): IdentityWalletState {
  const profile = useAppStore((s) => s.profile);
  const spoons = useAppStore((s) => s.spoons);
  const showToast = useAppStore((s) => s.showToast);
  const refreshLoveBalance = useAppStore((s) => s.refreshLoveBalance);

  const [loading, setLoading] = useState(true);
  const [did, setDid] = useState<string>('');
  const [edPub, setEdPub] = useState<string | null>(null);
  const [mldsaPub, setMldsaPub] = useState<string | null>(null);
  const [slhdsaPub, setSlhdsaPub] = useState<string | null>(null);
  const [slhdsaReady, setSlhdsaReady] = useState(false);
  const [pqcReady, setPqcReady] = useState(false);
  const [kelEvents, setKelEvents] = useState<KelEvent[] | null>(null);
  const [livePassport, setLivePassport] = useState<CognitivePassportLive | null>(null);
  const [oauthProvider, setOauthProvider] = useState<string | null>(null);

  const peers = useMeshPeers();
  const meshStatus = useMeshStatus();
  const { r, phase, mode } = useKuramotoOrderParameter();
  const bonding = useSyncExternalStore(subscribeBonding, getBondingState, getBondingState);
  const loveWallet = useSyncExternalStore(subscribeLoveEngine, getLoveWallet, getLoveWallet);
  const loveTransactions = useSyncExternalStore(subscribeLoveEngine, getLoveTransactions, getLoveTransactions);

  const kelValid = !!kelEvents && kelEvents.length > 0;
  const kelCount = kelEvents?.length ?? 0;
  const kelLatestSaid = kelEvents?.slice(-1)[0]?.said;
  const credentialCount = profile?.sbts?.length ?? 0;

  const trust = useMemo(
    () =>     computeTrustScore({
      kelValid,
      keysFresh: pqcReady && slhdsaReady,
      credentialCount,
      peerAttestations: peers,
    }),
    [kelValid, pqcReady, slhdsaReady, credentialCount, peers],
  );

  const refresh = useCallback(async () => {
    try {
      const [newDid, pub, pqc, mldsa, slhdsa, slhdsaReady] = await Promise.all([
        getOrCreateDidKey(),
        getEd25519PubKeyB64(),
        isPqcReady(),
        getMldsa65PubKeyB64().catch(() => null),
        getSlhdsa128sPubKeyB64().catch(() => null),
        isSlhdsaReady().catch(() => false),
      ]);
      setDid(newDid);
      setEdPub(pub);
      setPqcReady(pqc);
      setMldsaPub(mldsa);
      setSlhdsaPub(slhdsa);
      setSlhdsaReady(slhdsaReady);

      const kel = await getKEL().catch(() => null);
      setKelEvents(kel?.events ?? null);

      const live = await buildPassport(true);
      setLivePassport(live);

      refreshLoveBalance?.().catch(() => {});
    } catch {
      // non-fatal — UI degrades to whatever state is available
    } finally {
      setLoading(false);
    }
  }, [refreshLoveBalance]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sign = useCallback(async (message: string): Promise<string | null> => {
    return signWithDid(message);
  }, []);

  const ensurePqc = useCallback(async () => {
    try {
      await getOrCreatePqcKey();
      setPqcReady(true);
      const mldsa = await getMldsa65PubKeyB64();
      setMldsaPub(mldsa);
      showToast?.('ML-DSA-65 keys ready', 'success');
    } catch {
      showToast?.('PQC key generation failed', 'error');
    }
  }, [showToast]);

  const ensureSlhdsa = useCallback(async () => {
    try {
      await getOrCreateSlhdsaKey();
      setSlhdsaReady(true);
      const slhdsa = await getSlhdsa128sPubKeyB64();
      setSlhdsaPub(slhdsa);
      showToast?.('SLH-DSA-128s keys ready', 'success');
    } catch {
      showToast?.('SLH-DSA key generation failed', 'error');
    }
  }, [showToast]);

  const oauthLogin = useCallback(async (provider: 'google' | 'github') => {
    try {
      await startOAuthFlowPAR(provider);
    } catch {
      // Fallback to direct redirect if PAR endpoint is unavailable
      const state = generateState();
      sessionStorage.setItem('p31-oauth-state', state);
      const authUrl = buildOAuthUrl(provider, state, '');
      window.location.href = authUrl;
    }
  }, []);

  const oauthLogout = useCallback(() => {
    clearOAuthSession();
    setOauthProvider(null);
    showToast?.('OAuth unlinked', 'success');
  }, [showToast]);

  useEffect(() => {
    const session = getOAuthSession();
    if (session?.provider) {
      setOauthProvider(session.provider);
    }
  }, []);

  const passport = useMemo<UnifiedCognitivePassport | null>(
    () => (livePassport ? mergePassport(livePassport, null) : null),
    [livePassport],
  );

  return {
    loading,
    did,
    edPub,
    mldsaPub,
    slhdsaPub,
    slhdsaReady,
    pqcReady,
    kelEvents,
    kelValid,
    kelCount,
    kelLatestSaid,
    loveWallet,
    loveTransactions,
    careScore: loveWallet.careScore,
    passport,
    livePassport,
    trust,
    credentialCount,
    meshPeers: peers,
    meshStatus,
    r,
    phase,
    mode,
    spoons,
    bondingRitualsCompleted: bonding.completed.length,
    bondingLoveDelta: bonding.loveDelta,
    refresh,
    sign,
    ensurePqc,
    ensureSlhdsa,
    oauthProvider,
    oauthLinked: !!oauthProvider,
    oauthLogin,
    oauthLogout,
  };
}
