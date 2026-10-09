/**
 * Meatspace bonding game model — Atoms, Bonds, and ritual Activities.
 * K₄ complete graph over the family mesh; LOVE-weighted edges; ghost nodes
 * fill an incomplete tetrahedron.
 *
 * Ported from the meatspace portal (portals/meatspace/src/lib/game.ts),
 * extended with weekly ritual quests for the shell's bonding surface.
 */

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

export interface RitualActivity {
  id: string;
  type: 'meal' | 'walk' | 'read' | 'game' | 'talk';
  icon: string;
  text: string;
  ts: number;
  dueAt: number;
  loveReward: number;
  completed: boolean;
  participants: string[];
}

export const RITUAL_TYPES: { type: RitualActivity['type']; icon: string; label: string }[] = [
  { type: 'meal', icon: '🍽️', label: 'Shared meal' },
  { type: 'walk', icon: '🚶', label: 'Walk together' },
  { type: 'read', icon: '📖', label: 'Read-aloud' },
  { type: 'game', icon: '🎲', label: 'Game night' },
  { type: 'talk', icon: '💬', label: 'Real talk' },
];

export interface MeshRosterNode {
  did: string;
  name?: string;
  spoons?: number;
  role?: string;
  lastSeen?: number;
}

export function timeAgo(ts: number): string {
  const diff = (Date.now() - ts) / 60000;
  if (diff < 1) return 'just now';
  if (diff < 60) return Math.floor(diff) + 'm ago';
  const hours = diff / 60;
  if (hours < 24) return Math.floor(hours) + 'h ago';
  return Math.floor(hours / 24) + 'd ago';
}

/** Map a mesh roster / peer set to tetrahedron atoms (zone assigned round-robin). */
export function atomsFromMesh(nodes: Map<string, MeshRosterNode> | Record<string, MeshRosterNode> | MeshRosterNode[]): Atom[] {
  let entries: MeshRosterNode[];
  if (Array.isArray(nodes)) entries = nodes;
  else if (nodes instanceof Map) entries = Array.from(nodes.values());
  else entries = Object.values(nodes || {});
  return entries.map((node, i) => ({
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

export function activitiesFromTransactions(txs: { id: string; description: string; created_at: number; type: string }[]): RitualActivity[] {
  const iconMap: Record<string, string> = {
    earn: '💎',
    spend: '🤝',
    bonus: '✨',
  };
  return txs.map((tx) => ({
    id: tx.id,
    type: 'talk',
    icon: iconMap[tx.type] || '📝',
    text: tx.description || tx.type,
    ts: tx.created_at,
    dueAt: tx.created_at,
    loveReward: 1,
    completed: true,
    participants: [],
  }));
}

/**
 * Weekly ritual quests — one per bond, rotating ritual type.
 * LOVE reward scales with bond weight (1–5 LOVE); overdue rituals glow.
 * Space-repetition intervals: rituals repeat 1 → 3 → 7 days per bond.
 */
export function generateRituals(bonds: Bond[], atoms: Atom[], now = Date.now()): RitualActivity[] {
  const nonGhost = atoms.filter((a) => !a.id.startsWith('ghost-'));
  if (nonGhost.length < 2) return [];

  const result: RitualActivity[] = [];
  for (const bond of bonds) {
    const aName = (atoms.find((a) => a.id === bond.a)?.name || bond.a).slice(0, 6);
    const bName = (atoms.find((a) => a.id === bond.b)?.name || bond.b).slice(0, 6);
    const type = RITUAL_TYPES[(bonds.indexOf(bond) + Math.floor(now / 86_400_000)) % RITUAL_TYPES.length];
    const intervals = [1, 3, 7];
    const intervalDays = intervals[Math.min(bonds.indexOf(bond) % 3, 2)];
    result.push({
      id: `ritual-${bond.id}`,
      type: type.type,
      icon: type.icon,
      text: `${type.label}: ${aName} ⟷ ${bName}`,
      ts: now,
      dueAt: now + intervalDays * 86_400_000,
      loveReward: Math.max(1, Math.round(1 + bond.weight * 4)),
      completed: false,
      participants: [bond.a, bond.b],
    });
  }
  return result;
}

/** Map a spoon level (0–5) to an atom tint/state used by the roster. */
export function spoonTint(spoons: number): string {
  if (spoons <= 0) return 'var(--p31-accent-red)';
  if (spoons <= 2) return 'var(--p31-accent-gold)';
  return 'var(--p31-accent-green)';
}

/** Solo self-care ritual — a lone operator can practice connection with themselves. */
export function soloRitual(now = Date.now()): RitualActivity {
  return {
    id: 'solo-care',
    type: 'talk',
    icon: '💗',
    text: 'Self-care check-in',
    ts: now,
    dueAt: now + 86_400_000,
    loveReward: 1,
    completed: false,
    participants: [],
  };
}
