// questEngine — the meatspace ritual quest loop.
// Source of truth for the ritual list rendered by BondingSurface; shared by
// the bonding:quest shell command so both paths complete the same quests and
// mint LOVE through the same path (live ledger best-effort, local delta always).

import type { RitualActivity } from '../../lib/meatspace/game';
import { soloRitual } from '../../lib/meatspace/game';
import { getBondingState, addLove, markRitualComplete } from './bondingState';
import { getLoveEngine } from '../../lib/loveEngine';
import { emitNotification } from '../../hooks/useNotificationHub';

let rituals: RitualActivity[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  for (const cb of listeners) cb();
}

export function setRituals(list: RitualActivity[]): void {
  rituals = list;
  emit();
}

export function getRituals(): RitualActivity[] {
  return rituals;
}

export function subscribeRituals(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

async function mintLove(reason: string, participants: string[]): Promise<void> {
  try {
    const { getOrCreateDidKey } = await import('../../lib/identity');
    const did = await getOrCreateDidKey();
    const res = await fetch('https://love-ledger.p31ca.org/api/love/earn', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: did,
        transactionType: 'care-attestation',
        metadata: { reason, participants },
      }),
    });
    if (res.ok) {
      const { useAppStore } = await import('../../store/useAppStore');
      useAppStore.getState().refreshLoveBalance?.().catch(() => {});
    }
  } catch { /* offline — LOVE delta tracked locally */ }
}

export interface QuestResult {
  ok: boolean;
  questId: string;
  loveReward: number;
  loveDelta: number;
  solo: boolean;
}

export async function completeRitualById(id: string): Promise<QuestResult> {
  const target = rituals.find((r) => r.id === id && !r.completed) ?? (id === 'solo-care' ? soloRitual() : null);
  const delta = getBondingState().loveDelta;
  if (!target) return { ok: false, questId: id, loveReward: 0, loveDelta: delta, solo: false };

  markRitualComplete(target.id);
  const newDelta = addLove(target.loveReward);

  const updated = rituals.map((r) => (r.id === target.id ? { ...r, completed: true } : r));
  if (!updated.some((r) => r.id === target.id)) updated.push({ ...target, completed: true });
  setRituals(updated);

  mintLove(`ritual:${target.type}`, target.participants).catch(() => {});

  if (target.participants.length > 0) {
    try {
      const engine = getLoveEngine();
      const peerId = target.participants[0];
      engine.ingest('BOND_FORMED', { peerId, ritualId: target.id, ritualType: target.type });
    } catch {
      // local ledger best-effort
    }
  }

  emitNotification({
    source: 'love',
    title: target.participants.length > 0 ? 'Ritual complete' : 'Self-care complete',
    body: `${target.text || target.type} — +${target.loveReward} LOVE`,
    icon: target.icon || '💎',
    priority: target.participants.length > 0 ? 'high' : 'medium',
  });

  return { ok: true, questId: target.id, loveReward: target.loveReward, loveDelta: newDelta, solo: target.participants.length === 0 };
}

/** Complete the next pending ritual (or the solo self-care fallback). */
export function completeNextRitual(): Promise<QuestResult> {
  const pending = rituals.filter((r) => !r.completed);
  return completeRitualById(pending[0]?.id ?? 'solo-care');
}
