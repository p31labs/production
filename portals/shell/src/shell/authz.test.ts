/**
 * shell/authz.test.ts + surface-registry.test.ts — negative controls for the
 * authorization layer and the surface seam. A gate that cannot fail is
 * furniture: every assertion here checks the deny direction too.
 */
import { describe, expect, it } from 'vitest';
import { can, isConsequential, actionsFor, type Action, type Role } from './authz';
import {
  homeSurfaceForArtifact,
  canAccessSurface,
  artifactsForSurface,
  ARTIFACT_HOME,
} from './surface-registry';

describe('authz.can', () => {
  it('fail-closed: no role gets nothing', () => {
    expect(can(null, 'view')).toBe(false);
    expect(can(undefined, 'view')).toBe(false);
  });

  it('viewer may view + export, never delete/deploy/manage', () => {
    expect(can('viewer', 'view')).toBe(true);
    expect(can('viewer', 'export')).toBe(true);
    expect(can('viewer', 'create')).toBe(false);
    expect(can('viewer', 'delete')).toBe(false);
    expect(can('viewer', 'deploy')).toBe(false);
    expect(can('viewer', 'manageFace')).toBe(false);
  });

  it('operator may deploy + approve but not delete/manage', () => {
    expect(can('operator', 'deploy')).toBe(true);
    expect(can('operator', 'approve')).toBe(true);
    expect(can('operator', 'delete')).toBe(false);
    expect(can('operator', 'manageFace')).toBe(false);
  });

  it('admin holds every action', () => {
    const all: Action[] = ['view', 'export', 'create', 'edit', 'deploy', 'approve', 'delete', 'manageFace'];
    for (const a of all) expect(can('admin', a)).toBe(true);
  });
});

describe('authz.isConsequential', () => {
  it('marks delete/deploy/approve/manage consequential, not view/create', () => {
    expect(isConsequential('delete')).toBe(true);
    expect(isConsequential('deploy')).toBe(true);
    expect(isConsequential('approve')).toBe(true);
    expect(isConsequential('manageFace')).toBe(true);
    expect(isConsequential('view')).toBe(false);
    expect(isConsequential('create')).toBe(false);
    expect(isConsequential('edit')).toBe(false);
  });
});

describe('authz.actionsFor', () => {
  it('returns the permission set for a role, empty for none', () => {
    expect(actionsFor('viewer')).toEqual(['view', 'export']);
    expect(actionsFor(null)).toEqual([]);
    expect(actionsFor('operator')).toContain('deploy');
    expect(actionsFor('operator')).not.toContain('delete');
  });
});

describe('surface registry', () => {
  it('maps artifact kinds to their home surface', () => {
    expect(homeSurfaceForArtifact('report')).toBe('audit');
    expect(homeSurfaceForArtifact('website')).toBe('studio');
    expect(homeSurfaceForArtifact('app')).toBe('studio');
    expect(homeSurfaceForArtifact('game')).toBeNull();
    expect(homeSurfaceForArtifact('nonsense')).toBeNull();
  });

  it('surface floor: studio requires operator+, not viewer', () => {
    expect(canAccessSurface('viewer', 'studio')).toBe(false);
    expect(canAccessSurface('operator', 'studio')).toBe(true);
    expect(canAccessSurface('admin', 'studio')).toBe(true);
  });

  it('surface floor: audit is open to viewers', () => {
    expect(canAccessSurface('viewer', 'audit')).toBe(true);
  });

  it('fail-closed: absent role cannot open a floored surface', () => {
    expect(canAccessSurface(null, 'studio')).toBe(false);
    expect(canAccessSurface(undefined, 'audit')).toBe(false);
  });

  it('unlisted surface is open (caller owns the check)', () => {
    expect(canAccessSurface('viewer', 'docs')).toBe(true);
  });

  it('artifactsForSurface lists the kinds routed there', () => {
    expect(artifactsForSurface('studio')).toEqual(['website', 'app']);
    expect(artifactsForSurface('audit')).toEqual(['report']);
    expect(artifactsForSurface('monetization')).toEqual([]);
  });

  it('ARTIFACT_HOME is frozen (registry must not mutate)', () => {
    expect(Object.isFrozen(ARTIFACT_HOME)).toBe(true);
  });
});