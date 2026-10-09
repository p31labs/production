// bondingState — persistent LOVE ledger for the bonding surface.
// LOVE earned from completed ritual quests accumulates locally here
// (offline-safe) while the live ledger mint runs best-effort in the background.

import { getLoveEngine } from '../../lib/loveEngine';

interface BondingState {
  loveDelta: number;
  completed: string[];
}

const KEY = 'p31:shell:bonding';
const listeners = new Set<() => void>();

function load(): BondingState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BondingState>;
      return {
        loveDelta: typeof parsed.loveDelta === 'number' ? parsed.loveDelta : 0,
        completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      };
    }
  } catch { /* first run */ }
  return { loveDelta: 0, completed: [] };
}

let state: BondingState = load();

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch { /* private mode */ }
}

function emit(): void {
  for (const cb of listeners) cb();
}

export function getBondingState(): BondingState {
  return state;
}

export function subscribeBonding(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function addLove(amount: number): number {
  state = { ...state, loveDelta: state.loveDelta + amount };
  save();
  emit();
  return state.loveDelta;
}

export function markRitualComplete(id: string): void {
  if (state.completed.includes(id)) return;
  state = { ...state, completed: [...state.completed, id] };
  save();
  emit();
}

export function placeBlock(meta?: Record<string, unknown>): void {
  try {
    getLoveEngine().blockPlaced(meta);
  } catch {
    // local ledger best-effort
  }
}
