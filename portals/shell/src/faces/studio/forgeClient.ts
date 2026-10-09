/**
 * faces/studio/forgeClient.ts — the studio face's real engine client.
 *
 * Runs the REAL pipelines and consumes the bus:
 *   - POST /api/forge/stream  → runs ui-forge forge(), appends to the ledger
 *   - POST /api/brain/stream  → (Node sidecar runs brain.mjs; the shell
 *     subscribes to the bus to see brain.* events)
 *   - subscribe() to /api/bus/stream → live events render in StageTrace
 */
import { subscribe, type BusSubscription } from '../../bus/client';
import type { BusEvent } from '../../bus/events';

export interface ForgeRunOptions {
  title: string;
  entities: Array<{ name: string; fields: string[] }>;
  actions: Array<{ name: string }>;
  k?: number;
}

/** Run the real ui-forge engine through the shell's forge stream endpoint.
 *  Returns the session id (events stream into the bus ledger). */
export async function runForge(opts: ForgeRunOptions): Promise<string> {
  const res = await fetch('/api/forge/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: opts.title,
      entities: opts.entities.map((e) => ({ name: e.name, fields: e.fields.map((f) => ({ name: f, type: 'string' })) })),
      actions: opts.actions,
      k: opts.k ?? 4,
    }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `forge HTTP ${res.status}`);
  }
  const data = (await res.json()) as { sessionId?: string };
  return data.sessionId ?? '';
}

/** Subscribe to the bus and collect events into a local array. Returns the
 *  subscription + a de-duped events array. */
export function watchBus(onEvent: (ev: BusEvent) => void): BusSubscription {
  return subscribe(undefined, onEvent);
}