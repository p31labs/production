import { useEffect, useRef, useState } from 'react';

export type WorkerHealthStatus = 'healthy' | 'degraded' | 'offline';

export interface WorkerHealthEntry {
  id: string;
  name: string;
  status: WorkerHealthStatus;
  latency: number | null;
}

const AGGREGATE_URL = 'https://status.p31ca.org/health';

const SURFACE_LABELS: Record<string, string> = {
  phos: 'PHOS',
  gateway: 'Gateway',
  p31ca: 'P31 Hub',
  willow: 'Willow',
  bonding: 'Bonding',
  arcade: 'Arcade',
  'love-ledger': 'LOVE Ledger',
  'device-registry': 'Device Registry',
  'artifact-registry': 'Artifact Registry',
  'multiplayer-room': 'Multiplayer Room',
  'shadow-bridge': 'Shadow Bridge',
  'genesis-gate': 'Genesis Gate',
};

interface AggregateResponse {
  checks?: Record<string, { ok?: boolean; latency_ms?: number }>;
}

const FALLBACK_WORKERS: { id: string; name: string; url: string }[] = [
  { id: 'vibe-generate', name: 'Vibe Generate', url: 'https://vibe-generate.trimtab-signal.workers.dev/health' },
  { id: 'app-supervisor', name: 'App Supervisor', url: 'https://app-supervisor.trimtab-signal.workers.dev/health' },
  { id: 'portal-chat', name: 'Portal Chat', url: 'https://portal-chat.trimtab-signal.workers.dev/health' },
  { id: 'ledger-bridge', name: 'Ledger Bridge', url: 'https://ledger-bridge.trimtab-signal.workers.dev/health' },
  { id: 'federation-bridge', name: 'Federation Bridge', url: 'https://federation-bridge.trimtab-signal.workers.dev/health' },
  { id: 'agent-runtime', name: 'Agent Runtime', url: 'https://agent-runtime.trimtab-signal.workers.dev/health' },
  { id: 'care-mesh', name: 'Care Mesh', url: 'https://care-mesh.trimtab-signal.workers.dev/health' },
];

const POLL_MS = 10_000;
const FALLBACK_POLL_MS = 60_000;
const TIMEOUT_MS = 5000;

async function probeAggregate(): Promise<WorkerHealthEntry[]> {
  const t0 = performance.now();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(AGGREGATE_URL, { cache: 'no-store', signal: controller.signal });
    window.clearTimeout(timer);
    if (!res.ok) return [];
    const body = (await res.json()) as AggregateResponse;
    if (!body.checks) return [];
    const latency = Math.round(performance.now() - t0);
    return Object.entries(body.checks).map(([id, check]) => ({
      id,
      name: SURFACE_LABELS[id] ?? id,
      status: check.ok === false ? 'degraded' : 'healthy',
      latency: check.latency_ms ?? latency,
    }));
  } catch {
    return [];
  }
}

async function probeWorker(worker: { id: string; name: string; url: string }): Promise<WorkerHealthEntry> {
  const start = performance.now();
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(worker.url, { cache: 'no-store', signal: controller.signal });
    window.clearTimeout(timer);
    const latency = Math.round(performance.now() - start);
    if (!res.ok) return { id: worker.id, name: worker.name, status: 'offline', latency: null };
    let degraded = false;
    try {
      const body = (await res.json()) as { healthy?: boolean; status?: string; ok?: boolean };
      degraded = !!(body && (body.healthy === false || body.status === 'degraded' || body.ok === false));
    } catch {
      degraded = false;
    }
    return { id: worker.id, name: worker.name, status: degraded ? 'degraded' : 'healthy', latency };
  } catch {
    return { id: worker.id, name: worker.name, status: 'offline', latency: null };
  }
}

export function useWorkerHealth(): Record<string, WorkerHealthEntry> {
  const [health, setHealth] = useState<Record<string, WorkerHealthEntry>>({});
  const stateRef = useRef({ fallbackTried: false, fallbackNextTs: 0 });

  useEffect(() => {
    let alive = true;
    let interval: number | null = null;

    const poll = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;

      const state = stateRef.current;
      const now = Date.now();

      let results = await probeAggregate();
      if (!alive) return;

      if (results.length === 0) {
        results = await probeAggregate();
        if (!alive) return;
      }

      if (results.length > 0) {
        state.fallbackTried = false;
        state.fallbackNextTs = 0;
        setHealth((prev) => {
          const next: Record<string, WorkerHealthEntry> = {};
          for (const r of results) next[r.id] = r;
          return next;
        });
        return;
      }

      if (!state.fallbackTried && now >= state.fallbackNextTs) {
        state.fallbackTried = true;
        state.fallbackNextTs = now + FALLBACK_POLL_MS;
        const fbResults = await Promise.allSettled(FALLBACK_WORKERS.map(probeWorker));
        if (!alive) return;
        setHealth((prev) => {
          const next = { ...prev };
          for (const r of fbResults) {
            if (r.status === 'fulfilled') next[r.value.id] = r.value;
          }
          return next;
        });
      }
    };

    poll();
    interval = window.setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      if (interval) window.clearInterval(interval);
    };
  }, []);

  return health;
}
