export const ZONES = ['vertex1', 'vertex2', 'vertex3', 'vertex4', 'wild'] as const;
export type Zone = typeof ZONES[number];

export const ZONE_EMOJI: Record<Zone, string> = {
  vertex1: '🔴',
  vertex2: '🔵',
  vertex3: '🟢',
  vertex4: '🟣',
  wild: '⚪'
};

export const ZONE_NAME: Record<Zone, string> = {
  vertex1: 'Vertex 1',
  vertex2: 'Vertex 2',
  vertex3: 'Vertex 3',
  vertex4: 'Vertex 4',
  wild: 'Wild'
};

export interface Atom {
  id: string;
  name: string;
  zone: Zone;
  spoons: number;
  bonds: number;
  av: string;
  color: Zone;
  seen: number;
}

export interface Bond {
  id: string;
  a: string;
  b: string;
  weight: number;
  curvature: number;
}

export interface Activity {
  id: string;
  icon: string;
  text: string;
  ts: number;
  type: string;
}

export function timeAgo(ts: number): string {
  const diff = (Date.now() - ts) / 60000;
  if (diff < 1) return 'just now';
  if (diff < 60) return Math.floor(diff) + 'm ago';
  const hours = diff / 60;
  if (hours < 24) return Math.floor(hours) + 'h ago';
  return Math.floor(hours / 24) + 'd ago';
}

export function atomsFromMesh(nodes: Map<string, any> | Record<string, any>): Atom[] {
  const entries = nodes instanceof Map ? Array.from(nodes.values()) : Object.values(nodes || {});
  return entries.map((node: any, i) => ({
    id: node.did,
    name: node.name || node.did.slice(0, 8),
    zone: ZONES[i % 4] as Zone,
    spoons: node.spoons ?? 3,
    bonds: 0,
    av: (node.did || '?')[0],
    color: ZONES[i % 4] as Zone,
    seen: node.lastSeen || Date.now(),
  }));
}

/** K₄ complete graph — all 6 pairwise bonds (Maxwell rigidity) */
export function bondsFromAtoms(atoms: Atom[]): Bond[] {
  const bonds: Bond[] = [];
  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      if (atoms[i].spoons === 0 || atoms[j].spoons === 0) continue;
      const weight = Math.min(1, (atoms[i].spoons + atoms[j].spoons) / 10 + 0.1);
      bonds.push({ id: `b${i}-${j}`, a: atoms[i].id, b: atoms[j].id, weight, curvature: weight - 0.5 });
    }
  }
  return bonds;
}

/** If < 4 atoms, ghost nodes fill the tetrahedron */
export function fillGhosts(atoms: Atom[]): Atom[] {
  const filled = [...atoms];
  while (filled.length < 4) {
    filled.push({
      id: `ghost-${filled.length}`,
      name: '?',
      zone: ZONES[filled.length % 4] as Zone,
      spoons: 0,
      bonds: 0,
      av: '?',
      color: 'wild',
      seen: 0,
    });
  }
  return filled;
}

export function computeSymmetry(nodes: import('./tetrahedron').NodeData[]): number {
  const total = nodes.length;
  if (total === 0) return 0;
  const active = nodes.filter(n => n.spoons > 0 && n.role !== 'ghost').length;
  return Math.round((active / Math.max(1, Math.min(4, total))) * 100);
}

export function computeCurvature(edges: Bond[]): number {
  if (edges.length === 0) return 0;
  const avg = edges.reduce((s, e) => s + (e.curvature || 0), 0) / edges.length;
  return Math.max(-1, Math.min(1, avg * 2));
}

export function activitiesFromTransactions(txs: { id: string; description: string; created_at: number; type: string }[]): Activity[] {
  const iconMap: Record<string, string> = {
    earn: '💎',
    spend: '🤝',
    bonus: '✨',
  };
  return txs.map((tx) => ({
    id: tx.id,
    icon: iconMap[tx.type] || '📝',
    text: tx.description || tx.type,
    ts: tx.created_at,
    type: tx.type,
  }));
}
