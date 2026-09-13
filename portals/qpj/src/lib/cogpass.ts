import { getProfile } from '@p31/sovereign-core';
import { useQpjStore } from '../store/useQpjStore';
import type { Identity } from '../lib/identity';
import type { Preferences, Reputation, Relations, Tetrahedron, TetraVertex } from '@p31/sovereign-core';

export interface CogPass {
  version: 1;
  issuedAt: number;
  identity: Identity;
  tetrahedron: Tetrahedron<TetraVertex>;
}

function vertexDid(value: string): TetraVertex {
  return { type: 'did', value };
}

function vertexReputation(value: Reputation): TetraVertex {
  return { type: 'reputation', value };
}

function vertexPreferences(value: Preferences): TetraVertex {
  return { type: 'preferences', value };
}

function vertexRelations(value: Relations): TetraVertex {
  return { type: 'relations', value };
}

export function assembleCogPass(identity: Identity): CogPass {
  const profile = getProfile();
  const store = useQpjStore.getState();
  const vertices = profile.tetrahedron.vertices;

  const rawPrefs = vertices[2].type === 'preferences' ? vertices[2].value : {};
  const preferences: Preferences = {
    spoons: store.spoons,
    spoonQuadrants: store.spoonQuadrants,
    darkMode: store.darkMode,
    reduceMotion: store.reduceMotion,
    soundEffects: store.soundEffects,
    mood: store.mood,
    motionScale: store.motionScale,
    soundScale: store.soundScale,
    contrastTarget: store.contrastTarget,
    density: store.density,
    breathPattern: store.breathPattern,
    zeitgeber: store.zeitgeber,
    ...rawPrefs,
  };
  const reputation = vertices[1].type === 'reputation' ? vertices[1].value : { careScore: 0.5, trustTier: 0, sbts: [], loveBalance: 0 };
  const relations = vertices[3].type === 'relations' ? vertices[3].value : { familyDid: null, guardianDid: null, meshPeers: [], caregiverPin: null };

  return {
    version: 1,
    issuedAt: Date.now(),
    identity,
    tetrahedron: {
      symmetry: profile.tetrahedron.symmetry,
      curvature: profile.tetrahedron.curvature,
      status: profile.tetrahedron.status,
      vertices: [
        vertexDid(identity.did),
        vertexReputation(reputation),
        vertexPreferences(preferences),
        vertexRelations(relations),
      ],
    },
  };
}

export function exportCogPassJSON(cogpass: CogPass): string {
  return JSON.stringify(cogpass, null, 2);
}
