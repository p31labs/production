/**
 * shell/face.test.ts — the face manifest contract.
 */
import { describe, expect, it } from 'vitest';
import { validateFaceOwnership, normalizeFaceManifest, type FaceManifest } from './face';

const GOOD: FaceManifest = {
  id: 'studio',
  name: 'Studio',
  version: '1.0.0',
  tier: 'declarative',
  wordmark: 'UI Forge',
  search: 'x',
  action: 'Build',
  actionKind: 'primary',
  nav: [{ path: '/', label: 'Forge' }],
  routes: [{ path: '/', label: 'Forge', component: 'studio-main' }],
  capabilities: { bus: true },
};

describe('face manifest contract', () => {
  it('accepts a valid manifest', () => {
    expect(validateFaceOwnership(GOOD)).toEqual([]);
  });

  it('rejects a missing id', () => {
    expect(validateFaceOwnership({ ...GOOD, id: '' })).toContain('id is required (string)');
  });

  it('rejects an unknown tier', () => {
    expect(validateFaceOwnership({ ...GOOD, tier: 'magic' as never })).toEqual(
      expect.arrayContaining(["tier must be 'controlled' | 'declarative' | 'open'"]),
    );
  });

  it('rejects unknown fields', () => {
    expect(validateFaceOwnership({ ...GOOD, layout: 'grid' } as never)).toEqual(
      expect.arrayContaining(['unknown field: layout']),
    );
  });

  it('rejects geometry overrides (the shell owns geometry)', () => {
    expect(validateFaceOwnership({ ...GOOD, sidebarWidth: '300px' } as never)).toEqual(
      expect.arrayContaining(['geometry override not allowed: sidebarWidth']),
    );
  });

  it('normalize fills defaults and throws on violations', () => {
    const m = normalizeFaceManifest({ id: 'x', name: 'X', wordmark: 'W' });
    expect(m.tier).toBe('controlled');
    expect(m.routes).toEqual([]);
    expect(() => normalizeFaceManifest({ name: 'no-id' })).toThrow();
  });
});