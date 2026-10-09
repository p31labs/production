/**
 * bus/client.ts — the bus client. Surfaces subscribe to the normalized event
 * stream via SSE (with ?since= replay), and publish by POSTing to /api/bus/emit.
 */

import type { BusEvent } from './events';

export interface BusSubscription {
  /** Attach a listener for every event. */
  on(fn: (ev: BusEvent) => void): void;
  /** Attach a listener for one event type. */
  onType(type: string, fn: (ev: BusEvent) => void): void;
  /** Tear down the subscription. */
  close(): void;
}

const BASE = import.meta.env.VITE_BUS_URL ?? '';

/** Open a live SSE subscription to the bus. `since` replays missed events
 *  first (fetched via /api/bus/events?since=), then streams live.
 *  Returns an unsubscribe handle. */
export function subscribe(
  since?: string,
  onEvent?: (ev: BusEvent) => void,
): BusSubscription {
  const listeners = new Set<(ev: BusEvent) => void>();
  if (onEvent) listeners.add(onEvent);

  let es: EventSource | null = null;
  let closed = false;

  // 1) Replay any events after `since`.
  if (since) {
    void fetch(`${BASE}/api/bus/events?since=${encodeURIComponent(since)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: unknown) => {
        if (closed) return;
        const events = (data as { events?: BusEvent[] } | null)?.events ?? [];
        for (const ev of events) {
          for (const fn of [...listeners]) fn(ev);
        }
      })
      .catch(() => {});
  }

  // 2) Open the live SSE stream.
  es = new EventSource(`${BASE}/api/bus/stream`);
  es.onmessage = (msg) => {
    if (closed) return;
    try {
      const ev = JSON.parse(msg.data) as BusEvent;
      for (const fn of [...listeners]) fn(ev);
    } catch { /* skip malformed */ }
  };
  es.onerror = () => { /* EventSource auto-reconnects */ };

  return {
    on(fn) { listeners.add(fn); },
    onType(type, fn) {
      listeners.add((ev) => { if (ev.type === type) fn(ev); });
    },
    close() {
      closed = true;
      es?.close();
      listeners.clear();
    },
  };
}

/** Publish an event into the bus. Returns the stored event or null on failure. */
export async function publish(ev: BusEvent): Promise<BusEvent | null> {
  try {
    const res = await fetch(`${BASE}/api/bus/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ev),
    });
    return res.ok ? (res.json() as Promise<BusEvent>) : null;
  } catch {
    return null;
  }
}

/** Fetch recent events (for replay / audit preview). */
export async function fetchEvents(limit = 100, since?: string): Promise<BusEvent[]> {
  const qs = since ? `?limit=${limit}&since=${encodeURIComponent(since)}` : `?limit=${limit}`;
  try {
    const res = await fetch(`${BASE}/api/bus/events${qs}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { events?: BusEvent[] };
    return data.events ?? [];
  } catch {
    return [];
  }
}

/** Verify the ledger chain integrity (for the audit surface). */
export async function verifyChain(): Promise<{ valid: boolean; total_entries: number; last_hash?: string }> {
  try {
    const res = await fetch(`${BASE}/api/bus/verify-chain`);
    return res.ok ? ((await res.json()) as { valid: boolean; total_entries: number; last_hash?: string }) : { valid: false, total_entries: 0 };
  } catch {
    return { valid: false, total_entries: 0 };
  }
}