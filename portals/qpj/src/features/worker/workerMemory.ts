import type { WorkerMemoryEntry } from './types';

const KEY = (passportId: string) => `qpj:worker:memory:${passportId}`;
const MAX_ENTRIES = 200;

export function loadMemory(passportId: string): WorkerMemoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY(passportId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WorkerMemoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMemory(passportId: string, entries: WorkerMemoryEntry[]): void {
  localStorage.setItem(KEY(passportId), JSON.stringify(entries.slice(-MAX_ENTRIES)));
}

export function remember(
  entries: WorkerMemoryEntry[],
  kind: WorkerMemoryEntry['kind'],
  key: string,
  value: string,
): WorkerMemoryEntry[] {
  const now = Date.now();
  const existing = entries.find((e) => e.kind === kind && e.key === key);
  if (existing) {
    return entries.map((e) =>
      e === existing ? { ...e, value, hitCount: e.hitCount + 1, createdAt: now } : e,
    );
  }
  return [...entries, {
    id: `mem-${now}-${Math.random().toString(36).slice(2, 7)}`,
    kind, key, value, createdAt: now, hitCount: 1,
  }];
}
