import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSubstrateConfig, submitGoal, verifyPassport, checkStatus } from './substrate';
import { useSubstrate } from '../store/useQpjStore';
import { substrateStorage } from './substrate-storage';

describe('substrate', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('useSubstrate returns ready:true in local mode', () => {
    const { mode, ready } = useSubstrate();
    expect(mode).toBe('local');
    expect(ready).toBe(true);
  });

  it('does not dual-write when edge is disabled', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    await substrateStorage.setItem('qpj:test', 'value');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  describe('getSubstrateConfig', () => {
    it('returns config with enabled=false by default', () => {
      const config = getSubstrateConfig();
      expect(config.enabled).toBe(false);
      expect(config.dispatchUrl).toBeDefined();
      expect(config.cpuMs).toBe(5000);
      expect(config.subRequests).toBe(50);
    });
  });

  describe('submitGoal', () => {
    it('returns error when substrate disabled', async () => {
      const result = await submitGoal('dillpickle', 'build an artifact');
      expect(result.ok).toBe(false);
      expect(result.deferred).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('limits are validated after the enabled check', async () => {
      const result = await submitGoal('dillpickle', 'test', { cpuMs: 10000, subRequests: 100 });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('substrate disabled');
    });

    it('returns error when dispatch is unreachable', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'));
      const result = await submitGoal('dillpickle', 'test');
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('verifyPassport', () => {
    it('returns passed=false when dispatch is unreachable', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'));
      const result = await verifyPassport('dillpickle');
      expect(result.passed).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('checkStatus', () => {
    it('returns error when dispatch is unreachable', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'));
      const result = await checkStatus('dillpickle', '/api/status');
      expect(result.ok).toBe(false);
    });
  });
});
