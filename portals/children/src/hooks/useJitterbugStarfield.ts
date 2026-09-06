import { useEffect, useRef } from 'react';
import { mountJitterbugStarfield, type JitterbugStarfieldInstance, type VertexData, type BrightStarData, type EdgeData } from '@p31/ui';
import { useAppStore } from '../store/useAppStore';
import { useWorkerHealth } from '@p31/ui';

declare global {
  interface Window {
    __jitterbug?: JitterbugStarfieldInstance;
  }
}

interface UseJitterbugStarfieldOptions {
  spoons?: number;
  voltage?: 'GREEN' | 'AMBER' | 'RED' | 'BLUE';
  connectionAudio?: boolean;
  safeMode?: boolean;
  poetsMode?: boolean;
  paused?: boolean;
}

const ROLE_COLOR: Record<string, [number, number, number]> = {
  child: [204, 98, 71],
  teen: [77, 184, 168],
  parent: [139, 92, 246],
  guest: [245, 190, 11],
  ghost: [128, 132, 145],
};

const SLOTS: [number, number][] = [
  [0, 0.66],
  [-0.68, -0.22],
  [0.68, -0.22],
  [0, 0.1],
];

export function useJitterbugStarfield(options: UseJitterbugStarfieldOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<JitterbugStarfieldInstance | null>(null);
  const mesh = useAppStore((s) => s.mesh);
  const profile = useAppStore((s) => s.profile);
  const workerHealth = useWorkerHealth();

  useEffect(() => {
    if (!containerRef.current) return;
    instanceRef.current = mountJitterbugStarfield(containerRef.current, {
      spoons: options.spoons ?? 3,
      voltage: options.voltage ?? 'GREEN',
      connectionAudio: options.connectionAudio ?? false,
      safeMode: options.safeMode ?? false,
      poetsMode: options.poetsMode ?? false,
    });
    window.__jitterbug = instanceRef.current;
    return () => {
      instanceRef.current?.destroy();
      window.__jitterbug = undefined;
    };
  }, []);

  useEffect(() => {
    instanceRef.current?.setSpoons(options.spoons ?? 3);
  }, [options.spoons]);

  useEffect(() => {
    instanceRef.current?.setPaused(!!options.paused);
  }, [options.paused]);

  const meshRef2 = useRef<{ ids: string; local: string } | null>(null);

  useEffect(() => {
    if (!instanceRef.current) return;
    const build = () => {
      const inst = instanceRef.current;
      if (!inst) return;
      const nodes = mesh?.nodes
        ? mesh.nodes instanceof Map
          ? Array.from(mesh.nodes.values())
          : Object.values(mesh.nodes)
        : [];
      const online = nodes.filter((n) => n.status === 'online');
      const local = mesh?.localDid
        ? { did: mesh.localDid, spoons: options.spoons ?? 3, role: profile?.role ?? 'guest', status: 'online' as const }
        : null;
      const peers = online.filter((n) => n.did !== mesh?.localDid);
      const all = [local, ...peers].filter(Boolean) as { did: string; spoons: number; role: string; status: 'online' }[];

      const vertices: VertexData[] = [];
      for (let i = 0; i < Math.min(4, all.length); i++) {
        const node = all[i];
        vertices.push({
          id: node.did,
          x: SLOTS[i][0],
          y: SLOTS[i][1],
          r: 3 + node.spoons * 0.5,
          color: ROLE_COLOR[node.role] ?? ROLE_COLOR.guest,
          pulse: 0.35 + (node.spoons / 5) * 0.65,
          spoons: node.spoons,
          status: 'online',
          label: node.role,
        });
      }
      for (let i = all.length; i < 4; i++) {
        vertices.push({
          id: `ghost-${i}`,
          x: SLOTS[i][0],
          y: SLOTS[i][1],
          r: 1.6,
          color: ROLE_COLOR.ghost,
          pulse: 0.18,
          spoons: 0,
          status: 'ghost',
        });
      }

      const edgeColor: [number, number, number] = (mesh?.curvature ?? 0) >= 0 ? [77, 184, 168] : [204, 98, 71];
      const edges: EdgeData[] = [];
      for (let a = 0; a < vertices.length; a++) {
        for (let b = a + 1; b < vertices.length; b++) {
          if (vertices[a].status === 'ghost' || vertices[b].status === 'ghost') continue;
          edges.push({
            source: vertices[a].id,
            target: vertices[b].id,
            weight: (vertices[a].spoons + vertices[b].spoons) / 10,
            color: edgeColor,
          });
        }
      }

      inst.updateVertices(vertices);
      inst.updateEdges(edges);
    };

    const ids = onlineIds();
    const local = mesh?.localDid ?? '';
    const prev = meshRef2.current;
    const identityChanged = !prev || prev.ids !== ids || prev.local !== local;
    meshRef2.current = { ids, local };

    if (identityChanged) {
      build();
      return;
    }
    const timer = window.setTimeout(build, 500);
    return () => window.clearTimeout(timer);
  }, [mesh, options.spoons, profile?.role]);

  function onlineIds(): string {
    if (!mesh?.nodes) return '';
    const nodeEntries = mesh.nodes instanceof Map ? Array.from(mesh.nodes.values()) : Object.values(mesh.nodes);
    return nodeEntries
      .filter((n) => n.status === 'online')
      .map((n) => n.did)
      .sort()
      .join(',');
  }

  useEffect(() => {
    const inst = instanceRef.current;
    if (!inst) return;
    const entries = Object.values(workerHealth);
    if (entries.length === 0) return;
    const stars: BrightStarData[] = entries.map((w, i) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / entries.length;
      const load = Math.min(1, Math.max(0, (w.latency ?? 0) / 2000));
      const color: [number, number, number] =
        w.status === 'offline' ? [204, 98, 71] : w.status === 'degraded' ? [245, 190, 11] : [245, 240, 232];
      return {
        id: w.id,
        x: 0.62 * Math.cos(angle),
        y: -0.62 * Math.sin(angle),
        r: w.status === 'offline' ? 1.2 : 1.8 + load * 1.4,
        color,
        pulse: 0.5 + load * 0.5,
        health: w.status,
        load,
      };
    });
    inst.updateBrightStars(stars);
  }, [workerHealth]);

  return {
    containerRef,
    notify: (type: string, x: number, y: number, msg?: string) =>
      instanceRef.current?.notify(type, x, y, msg),
  };
}
