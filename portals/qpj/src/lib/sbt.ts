import { getProfile, updateTetrahedronVertex, addSBTMilestone, computeTetrahedronHash } from '@p31/sovereign-core';
import type { SBT, Reputation } from '@p31/sovereign-core';
import { anchorSbt } from './sbt-anchor';

export type SBTKind = 'achievement' | 'credential' | 'affiliation' | 'guardian';

export interface QpjSBTRecord {
  id: string;
  kind: SBTKind;
  name: string;
  description: string;
  issuedAt: string;
  blockNumber: number;
  prevHash: string | null;
  hash: string;
  metadata: Record<string, unknown>;
  tetrahedronHash: string;
}

const SBT_CHAIN_KEY = (did: string) => `qpj:sbt:chain:${did}`;

interface SBTChain {
  did: string;
  blocks: QpjSBTRecord[];
  headHash: string | null;
}

function loadChain(did: string): SBTChain {
  const raw = localStorage.getItem(SBT_CHAIN_KEY(did));
  if (!raw) return { did, blocks: [], headHash: null };
  try {
    const parsed = JSON.parse(raw) as SBTChain;
    return parsed.did === did ? parsed : { did, blocks: [], headHash: null };
  } catch {
    return { did, blocks: [], headHash: null };
  }
}

function saveChain(chain: SBTChain): void {
  localStorage.setItem(SBT_CHAIN_KEY(chain.did), JSON.stringify(chain));
}

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function appendSBT(
  did: string,
  kind: SBTKind,
  name: string,
  description: string,
  metadata: Record<string, unknown> = {},
): Promise<QpjSBTRecord> {
  const profile = getProfile();
  const tetraHash = computeTetrahedronHash({
    did: profile.did,
    name: profile.name,
    starCount: profile.starCount,
    gamesCompleted: profile.gamesCompleted,
  });

  const chain = loadChain(did);
  const blockNumber = chain.blocks.length;
  const prevHash = chain.headHash;
  const issuedAt = new Date().toISOString();

  const payload = {
    id: `sbt-${did.slice(-8)}-${blockNumber}-${Date.now()}`,
    kind,
    name,
    description,
    issuedAt,
    blockNumber,
    prevHash,
    metadata,
    tetrahedronHash: tetraHash,
  };

  const hash = await sha256(JSON.stringify(payload));
  const record: QpjSBTRecord = { ...payload, hash };

  chain.blocks.push(record);
  chain.headHash = hash;
  saveChain(chain);

  // Fire the server anchor — makes this block server-authoritative via the
  // Loom. Never blocks the UI: on failure it queues and retries (offline-safe).
  void anchorSbt(did, record);

  return record;
}

export async function verifyChain(did: string): Promise<{ valid: boolean; brokenAt: number | null }> {
  const chain = loadChain(did);
  let prev: string | null = null;
  for (let i = 0; i < chain.blocks.length; i++) {
    const block = chain.blocks[i];
    const { hash: _h, ...payload } = block;
    const recomputed = await sha256(JSON.stringify(payload));
    if (recomputed !== block.hash) return { valid: false, brokenAt: i };
    if (block.prevHash !== prev) return { valid: false, brokenAt: i };
    prev = block.hash;
  }
  return { valid: true, brokenAt: null };
}

export function listSBTs(did: string): QpjSBTRecord[] {
  return loadChain(did).blocks;
}

export function mirrorSBTToProfile(
  did: string,
  record: QpjSBTRecord,
  milestoneKey: string,
): void {
  const profile = getProfile();
  const repVertex = profile.tetrahedron.vertices[1];
  const reputation: Reputation = repVertex.type === 'reputation'
    ? repVertex.value
    : { careScore: 0.5, trustTier: 0, sbts: [], loveBalance: 0 };

  const sbt: SBT = {
    id: record.id,
    type: record.kind,
    issuer: did,
    issuedAt: Date.now(),
    tetrahedronHash: record.tetrahedronHash,
    metadata: {
      name: record.name,
      description: record.description,
      blockNumber: record.blockNumber,
      hash: record.hash,
      prevHash: record.prevHash,
      issuedAt: record.issuedAt,
      kind: record.kind,
    },
  };

  addSBTMilestone(milestoneKey);
  updateTetrahedronVertex(1, {
    ...reputation,
    sbts: [...reputation.sbts, sbt],
  });
}

export { hasSBTMilestone } from '@p31/sovereign-core';
