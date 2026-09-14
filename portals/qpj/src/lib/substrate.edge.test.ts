import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { submitGoal } from './substrate';
import { useQpjStore, useSubstrate } from '../store/useQpjStore';

const EDGE_STORE_URL = 'https://p31-dispatch.example.workers.dev/api/store';
const STORE_KEY = 'qpj:store';

function edgeLove(careScore: number) {
  return {
    sovereignty: 3,
    performance: 2,
    careScore,
    lastCareAt: 7,
    log: [{ id: 'entry-1' }],
  };
}

function persistedPayload(love: unknown): string {
  return JSON.stringify({ state: { love }, version: 1 });
}

describe('substrate (edge mode)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('useSubstrate returns ready:true in edge mode', () => {
    const { mode, ready } = useSubstrate();
    expect(mode).toBe('edge');
    expect(ready).toBe(true);
  });

  it('validates cpuMs limit and rejects over-limit', async () => {
    const result = await submitGoal('dillpickle', 'test', { cpuMs: 10000 });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('exceeds');
  });

  it('validates subRequests limit and rejects over-limit', async () => {
    const result = await submitGoal('dillpickle', 'test', { subRequests: 100 });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('exceeds');
  });

  it('hydrates the store from the edge store (substrateStorage getItem)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ value: persistedPayload(edgeLove(42)) }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await useQpjStore.persist.rehydrate();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      EDGE_STORE_URL,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: STORE_KEY }),
      }),
    );
    expect(useQpjStore.getState().love.careScore).toBe(42);
    expect(useQpjStore.getState().love.log).toHaveLength(1);
  });

  it('falls back to localStorage when the edge store read fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);
    localStorage.setItem(STORE_KEY, persistedPayload(edgeLove(99)));

    await useQpjStore.persist.rehydrate();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(useQpjStore.getState().love.careScore).toBe(99);
  });
});
