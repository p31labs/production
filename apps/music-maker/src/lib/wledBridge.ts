/**
 * wledBridge — the WLED JSON bridge.
 *
 * Research constraint: WLED's JSON API handles ~1 update/sec comfortably and
 * ~10/sec at the absolute maximum. The ControlRoom's 60Hz budget is correct
 * for the synth; it is WRONG for WLED. This bridge has its own coalescer:
 * last-value-wins per segment, flushed at a configurable rate (default 5Hz).
 *
 * The bridge is feature-flagged and takes a user-entered address. No
 * hardcoded IPs. An unreachable device reports the honest offline state.
 */

export interface WledSegmentState {
  id?: number;
  on?: boolean | 't';
  bri?: number;
  col?: [number, number, number][];
  fx?: number;
  sx?: number;
  ix?: number;
  rev?: boolean;
  mi?: boolean;
}

export interface WledState {
  on?: boolean;
  bri?: number;
  seg?: WledSegmentState[];
  transition?: number;
}

export interface WledBridgeOptions {
  /** The device base URL, e.g. `http://192.168.1.50`. User-entered. */
  address: string;
  /** Flush rate in Hz. Default 5 (the safe range). Capped at 10. */
  hz?: number;
  /** Fetch implementation — injectable for tests. */
  fetchImpl?: typeof fetch;
}

export type WledStatus = 'offline' | 'connecting' | 'online' | 'error';

export class WledBridge {
  private readonly address: string;
  private readonly intervalMs: number;
  private readonly fetchImpl: typeof fetch;
  private pending: WledState | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private status: WledStatus = 'offline';
  private lastError: string | null = null;
  private listeners = new Set<(status: WledStatus, error: string | null) => void>();

  constructor(opts: WledBridgeOptions) {
    this.address = opts.address.replace(/\/+$/, '');
    // Cap at 10Hz — the researched ceiling.
    const hz = Math.min(opts.hz ?? 5, 10);
    this.intervalMs = Math.round(1000 / hz);
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  onStatus(fn: (status: WledStatus, error: string | null) => void): () => void {
    this.listeners.add(fn);
    fn(this.status, this.lastError);
    return () => this.listeners.delete(fn);
  }

  private emit(status: WledStatus, error: string | null = null): void {
    this.status = status;
    this.lastError = error;
    for (const fn of this.listeners) fn(status, error);
  }

  /** Queue a state patch. Last-value-wins: each call replaces the pending
   *  patch for the same key, so a 60Hz knob stream collapses to one flush. */
  enqueue(patch: WledState): void {
    this.pending = this.pending ? deepMerge(this.pending, patch) : patch;
    if (!this.timer) {
      this.timer = setInterval(() => void this.flush(), this.intervalMs);
    }
  }

  /** Flush the pending patch immediately. */
  async flush(): Promise<void> {
    if (!this.pending) return;
    const body = this.pending;
    this.pending = null;
    try {
      this.emit('connecting');
      const res = await this.fetchImpl(`${this.address}/json/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.emit('online');
    } catch (e) {
      this.emit('error', e instanceof Error ? e.message : String(e));
    }
  }

  /** Stop the coalescer. The bridge is single-use after close. */
  close(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.pending = null;
    this.emit('offline');
    this.listeners.clear();
  }

  get currentStatus(): WledStatus {
    return this.status;
  }
}

/** Shallow-per-key deep merge for state patches. Segment arrays merge by id. */
function deepMerge(a: WledState, b: WledState): WledState {
  const out: WledState = { ...a, ...b };
  if (a.seg && b.seg) {
    const byId = new Map<number, WledSegmentState>();
    a.seg.forEach((s, i) => byId.set(s.id ?? i, s));
    b.seg.forEach((s, i) => {
      const id = s.id ?? i;
      byId.set(id, { ...(byId.get(id) ?? {}), ...s });
    });
    out.seg = [...byId.entries()]
      .sort(([x], [y]) => x - y)
      .map(([, s]) => s);
  }
  return out;
}

/** The serializer a segment editor uses — round-trips with WLED's shape. */
export function segmentToWled(
  id: number,
  color: [number, number, number],
  brightness: number,
): WledSegmentState {
  return {
    id,
    on: true,
    bri: Math.round(Math.max(0, Math.min(1, brightness)) * 255),
    col: [color],
  };
}