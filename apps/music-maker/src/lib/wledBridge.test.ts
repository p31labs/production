import { describe, it, expect, vi } from 'vitest';
import { WledBridge, segmentToWled } from './wledBridge';

describe('wledBridge — the coalescer', () => {
  it('coalesces a burst into ONE fetch (last-value-wins)', async () => {
    const calls: unknown[] = [];
    const fakeFetch = vi.fn(async (_url: string, init?: RequestInit) => {
      calls.push(JSON.parse(String(init?.body)));
      return new Response('{"success":true}', { status: 200 });
    });
    const bridge = new WledBridge({ address: 'http://x', hz: 10, fetchImpl: fakeFetch as typeof fetch });

    for (let i = 0; i < 60; i++) {
      bridge.enqueue({ seg: [{ id: 0, bri: i }] });
    }
    await bridge.flush();
    bridge.close();

    expect(fakeFetch).toHaveBeenCalledTimes(1);
    expect((calls[0] as { seg: { bri: number }[] }).seg[0].bri).toBe(59);
  });

  it('reports the honest offline state on a failed flush', async () => {
    const fakeFetch = vi.fn(async () => new Response('nope', { status: 500 }));
    const bridge = new WledBridge({ address: 'http://x', hz: 10, fetchImpl: fakeFetch as typeof fetch });

    let status: string | null = null;
    bridge.onStatus((s) => { status = s; });
    bridge.enqueue({ bri: 128 });
    await bridge.flush();
    // Capture the error state BEFORE close() (which emits 'offline' last).
    expect(status).toBe('error');
    bridge.close();
  });

  it('caps the flush rate at 10Hz', () => {
    const bridge = new WledBridge({ address: 'http://x', hz: 100, fetchImpl: vi.fn() as unknown as typeof fetch });
    // The interval is computed from the capped hz: 1000/10 = 100ms.
    // @ts-expect-error — reading the private for the assertion
    expect(bridge.intervalMs).toBe(100);
    bridge.close();
  });

  it('serializes a segment with the confirmed WLED shape', () => {
    const s = segmentToWled(2, [0, 255, 200], 0.5);
    expect(s.id).toBe(2);
    expect(s.bri).toBe(128);
    expect(s.col).toEqual([[0, 255, 200]]);
  });
});