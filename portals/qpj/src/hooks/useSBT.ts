import { useEffect } from 'react';
import { useQpjStore } from '../store/useQpjStore';
import { useNotifStore } from '../store/useNotifStore';
import { getPassport } from '../lib/passports';
import { getProfile, hasSBTMilestone, addSBTMilestone } from '@p31/sovereign-core';
import { appendSBT, mirrorSBTToProfile } from '../lib/sbt';
import type { QpjSBTRecord, SBTKind } from '../lib/sbt';
import type { Relations } from '@p31/sovereign-core';

type StoreState = ReturnType<typeof useQpjStore.getState>;

export const MILESTONE_CLAIMED_SPACE = 'claimed_space' as const;

interface MilestoneDef {
  kind: SBTKind;
  name: string;
  description: string;
  check: (s: StoreState) => boolean;
}

const MILESTONES: Record<string, MilestoneDef> = {
  [MILESTONE_CLAIMED_SPACE]: {
    kind: 'credential',
    name: 'Claimed Space',
    description: 'You made your first key. This door is yours.',
    check: (s) => s.identity.status === 'ready' && s.identity.identity !== null,
  },
  first_peer: {
    kind: 'affiliation',
    name: 'First Peer',
    description: 'Someone else in the mesh can see you.',
    check: (s) => (s.presence ? Object.values(s.presence).filter((p) => p.online).length >= 2 : false),
  },
  coherent_week: {
    kind: 'achievement',
    name: 'Coherent Week',
    description: 'Seven days of steady breathing.',
    check: () => {
      const profile = getProfile();
      const rep = profile.tetrahedron.vertices[1];
      if (rep.type !== 'reputation') return false;
      const meta = rep.value as { coherentDays?: number };
      return (meta.coherentDays ?? 0) >= 7;
    },
  },
  first_build: {
    kind: 'achievement',
    name: 'First Build',
    description: 'You shipped something into the world.',
    check: (s) => Boolean(s.meshInstance && s.meshStatus === 'online'),
  },
  guardian: {
    kind: 'guardian',
    name: 'Guardian',
    description: 'A trusted grown-up for someone small.',
    check: () => {
      const profile = getProfile();
      const rel = profile.tetrahedron.vertices[3];
      if (rel.type !== 'relations') return false;
      return Boolean((rel.value as Relations).guardianDid);
    },
  },
} as const;

async function mintIfNew(key: string, did: string): Promise<QpjSBTRecord | null> {
  if (hasSBTMilestone(key)) return null;
  const milestone = MILESTONES[key];
  if (!milestone) return null;

  const record = await appendSBT(did, milestone.kind, milestone.name, milestone.description);
  mirrorSBTToProfile(did, record, key);
  addSBTMilestone(key);
  if (key === MILESTONE_CLAIMED_SPACE) {
    useQpjStore.getState().markBadgeDone();
  }
  useNotifStore.getState().notify({
    kind: 'milestone',
    title: milestone.name,
    body: milestone.description,
    burst: true,
  });
  useQpjStore.getState().earnLove(
    'milestone',
    getPassport(useQpjStore.getState().passportId).pickledName,
  );
  return record;
}

export function useSBT(): void {
  const identity = useQpjStore((s) => s.identity);

  useEffect(() => {
    if (identity.status !== 'ready' || !identity.identity) return;
    const did = identity.identity.did;

    const unsub = useQpjStore.subscribe((state) => {
      const toMint: string[] = [];
      for (const key of Object.keys(MILESTONES)) {
        if (hasSBTMilestone(key)) continue;
        if (MILESTONES[key].check(state as unknown as StoreState)) {
          toMint.push(key);
        }
      }
      void (async () => {
        for (const key of toMint) {
          try {
            await mintIfNew(key, did);
          } catch {
            /* a broken milestone must not crash the subscription */
          }
        }
      })();
    });

    return unsub;
  }, [identity.status, identity.identity]);
}
