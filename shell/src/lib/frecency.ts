const KEY = 'p31-shell:frecency';

export interface FrecencyEntry {
  score: number;
  ts: number;
}

export function getFrecency(): Record<string, FrecencyEntry> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

export function bumpFrecency(id: string) {
  const map = getFrecency();
  const now = Date.now();
  const prev = map[id];
  map[id] = {
    score: (prev?.score ?? 0) + 1,
    ts: now,
  };
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function frecencySort<T extends { id: string }>(items: T[]): T[] {
  const map = getFrecency();
  return [...items].sort((a, b) => {
    const sa = map[a.id]?.score ?? 0;
    const sb = map[b.id]?.score ?? 0;
    if (sb !== sa) return sb - sa;
    const ta = map[a.id]?.ts ?? 0;
    const tb = map[b.id]?.ts ?? 0;
    return tb - ta;
  });
}
