/**
 * Lumi agent identity — did:key + PQC capability token + co-presence scope.
 */

import { describe, it, expect } from 'vitest';
import { verifySelfContainedCapabilityToken } from '@p31ca/sovereign-primitives';
import { ScopeGuard } from '@p31ca/canon/loom/scope';
import {
  createLumiIdentity,
  mintLumiCapability,
  verifyLumiCapability,
  makeLumiTokenVerifier,
  DEFAULT_LUMI_SCOPE,
} from './lumi-identity';

describe('Lumi agent identity', () => {
  it('creates a did:key identity with the co-presence scope', async () => {
    const { identity, keys } = await createLumiIdentity();
    expect(identity.did.startsWith('did:key:z')).toBe(true);
    expect(identity.name).toBe('lumi');
    expect(identity.scope.coPresenceOnly).toBe(true);
    expect(identity.scope.maxProposalsPerSession).toBeGreaterThan(0);
    expect(keys.mlDsa65.publicKey.length).toBe(1952);
  });

  it('mints a self-contained capability token that verifies', async () => {
    const { identity, keys } = await createLumiIdentity();
    const token = await mintLumiCapability(identity, keys, 'room:family');
    expect(await verifyLumiCapability(token, { room: 'room:family', caps: ['propose'] })).toBe(true);
  });

  it('rejects a capability bound to a different room', async () => {
    const { identity, keys } = await createLumiIdentity();
    const token = await mintLumiCapability(identity, keys, 'room:a');
    expect(await verifyLumiCapability(token, { room: 'room:b' })).toBe(false);
  });

  it('rejects a tampered token', async () => {
    const { identity, keys } = await createLumiIdentity();
    const token = await mintLumiCapability(identity, keys, 'room:family');
    expect(await verifyLumiCapability(token + 'x', { room: 'room:family' })).toBe(false);
  });

  it('token caps — not the declaration — drive the scope guard', async () => {
    const { identity, keys } = await createLumiIdentity();
    const guard = new ScopeGuard(DEFAULT_LUMI_SCOPE, await makeLumiTokenVerifier('room:family'));
    // Mint with only the 'propose' cap; the declaration's proposeKinds also
    // lists 'review', so only the token can (and does) refuse the review.
    const token = await mintLumiCapability(identity, keys, 'room:family', ['propose']);
    const propose = await guard.guard({
      writer: 'agent', kind: 'propose', id: 'p1', node: '.street', body: { a: 1 }, token,
    });
    expect(propose.allowed).toBe(true);
    const review = await guard.guard({
      writer: 'agent', kind: 'review', id: 'r1', node: '.street', body: { a: 1 }, token,
    });
    expect(review.allowed).toBe(false);
    expect(review.reason).toMatch(/lacks cap/);
    // A token with no caps claims at all is still a valid credential — the
    // conformance check on the declaration still applies.
    const bare = new ScopeGuard(DEFAULT_LUMI_SCOPE, async () => ({ ok: true }));
    const outOfScope = await bare.guard({
      writer: 'agent', kind: 'propose', id: 'p2', node: '.private-note', body: { a: 1 }, token,
    });
    expect(outOfScope.allowed).toBe(false);
  });
});