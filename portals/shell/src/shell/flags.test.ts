/**
 * shell/flags.test.ts — negative controls for the feature-flag layer.
 * The invariant under test: flags narrow authorization, never widen it, and
 * fail closed — an unset flag is off.
 */
import { describe, expect, it } from 'vitest';
import { evaluateFlag, narrow, canWithFlag, staticProvider } from './flags';

describe('evaluateFlag (fail-closed)', () => {
  const flags = { newDashboard: true, legacyExport: false };

  it('explicit true → true', () => {
    expect(evaluateFlag('newDashboard', flags)).toBe(true);
  });

  it('explicit false → false', () => {
    expect(evaluateFlag('legacyExport', flags)).toBe(false);
  });

  it('unset flag → false (fail-closed)', () => {
    expect(evaluateFlag('doesNotExist', flags)).toBe(false);
  });

  it('unknown flag in an empty map → false', () => {
    expect(evaluateFlag('anything', {})).toBe(false);
  });
});

describe('narrow (the invariant)', () => {
  it('a flag can gate a true permission down to false', () => {
    expect(narrow(true, false)).toBe(false);
  });

  it('a flag can keep a true permission true', () => {
    expect(narrow(true, true)).toBe(true);
  });

  it('a flag CANNOT widen a false permission (never grants)', () => {
    expect(narrow(false, true)).toBe(false);
    expect(narrow(false, false)).toBe(false);
  });
});

describe('canWithFlag (authz narrowed by flag)', () => {
  it('admin deploy + flag on → true', () => {
    expect(canWithFlag('admin', 'deploy', true)).toBe(true);
  });

  it('admin deploy + flag off → false (the kill switch)', () => {
    expect(canWithFlag('admin', 'deploy', false)).toBe(false);
  });

  it('viewer deploy + flag on → false (flag cannot grant)', () => {
    expect(canWithFlag('viewer', 'deploy', true)).toBe(false);
  });

  it('viewer view + flag on → true (reversible action, flag on)', () => {
    expect(canWithFlag('viewer', 'view', true)).toBe(true);
  });

  it('no role + flag on → false (fail-closed at both layers)', () => {
    expect(canWithFlag(null, 'deploy', true)).toBe(false);
  });
});

describe('staticProvider', () => {
  it('resolves from the fixed map, fail-closed for unknowns', () => {
    const provider = staticProvider({ alpha: true, beta: false });
    expect(provider.get('alpha')).toBe(true);
    expect(provider.get('beta')).toBe(false);
    expect(provider.get('gamma')).toBe(false);
    expect(provider.name).toBe('static');
  });
});