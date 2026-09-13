import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { submitGoal } from './substrate';
import { useSubstrate } from '../store/useQpjStore';

describe('substrate (edge mode)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
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
});
