import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { anchorSbt, retryAnchorQueue } from '../lib/sbt-anchor';
import type { QpjSBTRecord } from '../lib/sbt';

function block(n: number, prevHash: string | null, hash: string): QpjSBTRecord {
  return {
    id: `anchor-test-${n}`,
    kind: 'achievement',
    name: `block-${n}`,
    description: 'test',
    issuedAt: '2026-09-21T00:00:00.000Z',
    blockNumber: n,
    prevHash,
    hash,
    metadata: {},
    tetrahedronHash: 't',
  };
}

const H0 = 'a'.repeat(64);
const H1 = 'b'.repeat(64);

// The anchor client must degrade gracefully: an offline anchor is queued, and
// a later retry flushes it in order. The local chain stays the UI source of
// truth — the anchor is best-effort proof that never blocks appendSBT.
describe('sbt-anchor — offline-safe queue', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('queues a block when the Loom is unreachable, then retries it', async () => {
    const fetchMock = vi.mocked(fetch);
    // First call fails (offline).
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    // Retry succeeds (200).
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const did = 'did:key:anchor-queue';
    const b0 = block(0, null, H0);

    await anchorSbt(did, b0);
    // Offline -> queued in localStorage.
    const queue = JSON.parse(localStorage.getItem('qpj:sbt:anchor:queue') ?? '[]');
    expect(queue).toHaveLength(1);
    expect(queue[0].block.hash).toBe(H0);
    expect(queue[0].did).toBe(did);

    // Retry flushes it.
    await retryAnchorQueue(did);
    const after = JSON.parse(localStorage.getItem('qpj:sbt:anchor:queue') ?? '[]');
    expect(after).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // The anchor POST sends { did, block }.
    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).block.hash).toBe(H0);
  });

  it('does not double-queue a block already in the queue', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockRejectedValue(new Error('offline'));

    const did = 'did:key:anchor-dedupe';
    const b0 = block(0, null, H0);

    await anchorSbt(did, b0);
    await anchorSbt(did, b0); // re-run of appendSBT for the same block

    const queue = JSON.parse(localStorage.getItem('qpj:sbt:anchor:queue') ?? '[]');
    expect(queue).toHaveLength(1);
  });

  it('flushes earlier pending blocks before a new one (ordering)', async () => {
    const fetchMock = vi.mocked(fetch);
    // Block 0 fails; block 1's anchorSbt triggers a retry of block 0 first.
    fetchMock
      .mockRejectedValueOnce(new Error('offline')) // block 0 direct
      .mockResolvedValueOnce(new Response('{}', { status: 200 })) // block 0 retry
      .mockResolvedValueOnce(new Response('{}', { status: 200 })); // block 1

    const did = 'did:key:anchor-order';
    const b0 = block(0, null, H0);
    const b1 = block(1, H0, H1);

    await anchorSbt(did, b0); // queued
    await anchorSbt(did, b1); // flush b0, then fire b1

    const queue = JSON.parse(localStorage.getItem('qpj:sbt:anchor:queue') ?? '[]');
    expect(queue).toHaveLength(0);
    // Three fetch calls: b0 direct (fail), b0 retry (ok), b1 (ok).
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});