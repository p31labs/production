import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { NodeData } from '@p31/ui';

export interface MeshPeer {
  did: string;
  name: string;
  spoons: number;
  role: string;
  love?: number;
  status?: string;
  lastSeen?: number;
}

export function useMeshTetraNodes(): { nodes: NodeData[]; peers: MeshPeer[] } {
  const mesh = useAppStore((s) => s.mesh);
  
  return useMemo(() => {
    const raw = mesh?.nodes ?? {};
    const entries = Object.entries(raw);
    
    const peers: MeshPeer[] = entries.map(([, data]: [string, any]) => ({
      did: data.did || data.localDid || '',
      name: data.name || (data.did || '').slice(0, 6),
      spoons: data.spoons ?? 3,
      role: data.role || 'guest',
      love: data.loveBalance ?? 0,
      status: data.status || 'online',
      lastSeen: data.lastSeen || Date.now(),
    }));

    const nodes: Array<NodeData & { love?: number }> = peers.slice(0, 4).map(p => ({
      id: p.did,
      label: p.name,
      spoons: p.spoons,
      role: p.role,
      love: p.love,
    }));

    while (nodes.length < 4) {
      nodes.push({
        id: `ghost-${nodes.length}`,
        label: '?',
        spoons: 0,
        role: 'ghost',
        love: 0,
      });
    }

    return { nodes, peers };
  }, [mesh?.nodes]);
}

export function edgeWeight(a: NodeData, b: NodeData): number {
  const la = (a as any).love ?? 0;
  const lb = (b as any).love ?? 0;
  const loveWeight = Math.min(1, (la + lb) / 100);
  const spoonHarmony = 1 - Math.abs(a.spoons - b.spoons) / 5;
  return Math.max(0.1, Math.min(1, (loveWeight + spoonHarmony) / 2));
}
