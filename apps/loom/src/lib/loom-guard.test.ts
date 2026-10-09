/**
 * Write-path guard tests — `guardAgentEvent` three-state enforcement
 * (off|observe|enforce), per-kind node derivation, token/caps, the session-cap
 * PIP (stubbed), and the JCS-canonicalized refusal sidecar chain.
 */

import { describe, it, expect, vi } from 'vitest';
import { verifyChain } from '@p31ca/canon/loom/hash-chain';
import { codename } from '@p31ca/canon/loom/codename';
import { guardAgentEvent, refusalToChainRecord, type RefusalRecord, type ServiceFetch } from '../../functions/api/loom/_lib/log';
import {
  base64urlEncode,
  compositePublicKey,
  generateCompositeKeyPair,
  mintCapabilityToken,
} from '@p31ca/sovereign-primitives';

const pipe = (response: { allowed: boolean; count: number; max: number }): ServiceFetch =>
  ({ fetch: async () => ({ json: async () => response }) as unknown as Response });

// The base enforce envs include a reachable PIP so the session branch succeeds.
const ENV = { LUMI_ENFORCEMENT: 'enforce' as const, LOOM_SSE: pipe({ allowed: true, count: 1, max: 8 }) };
const ENV_TOKEN = { LUMI_ENFORCEMENT: 'enforce' as const, LUMI_REQUIRE_TOKEN: 'true', LOOM_SSE: pipe({ allowed: true, count: 1, max: 8 }) };

const propose = (node: string, id = 'p1') => ({
  writer: 'agent' as const,
  kind: 'propose' as const,
  id,
  node,
  body: { label: 'x' },
});

async function mint(room: string, caps: string[]) {
  const keys = await generateCompositeKeyPair();
  const pub = compositePublicKey(keys);
  const iat = Date.now();
  return mintCapabilityToken(
    {
      iss: 'did:key:ztest',
      aud: 'p31-loom',
      room,
      caps,
      pk: { ed25519: base64urlEncode(pub.ed25519), mlDsa65: base64urlEncode(pub.mlDsa65) },
      iat,
      exp: iat + 600000,
    },
    keys,
  );
}

const verdict = (v: { allowed: boolean; reason?: string; mode?: string }) =>
  `${v.allowed ? 'allowed' : 'REFUSED'}${v.reason ? `(${v.reason})` : ''}${v.mode ? `[${v.mode}]` : ''}`;

describe('guardAgentEvent', () => {
  it('enforcement off: no scope/session checks', async () => {
    const v = await guardAgentEvent({}, propose('.private-note'));
    expect(v.allowed).toBe(true);
    expect(v.reason).toBeUndefined();
  });

  it('propose: in-surface allowed, out-of-surface refused (enforce)', async () => {
    expect(await guardAgentEvent(ENV, propose('.street'))).toMatchObject({ allowed: true });
    const v = await guardAgentEvent(ENV, propose('.private-note'));
    expect(v.allowed).toBe(false);
    expect(v.reason).toMatch(/outside Lumi's scope/);
    expect(v.mode).toBe('enforce');
  });

  it('observe mode: violation recorded but the event is allowed', async () => {
    const v = await guardAgentEvent({ LUMI_ENFORCEMENT: 'observe' as const }, propose('.private-note'));
    expect(v.allowed).toBe(true);
    expect(v.reason).toMatch(/outside Lumi's scope/);
    expect(v.mode).toBe('observe');
  });

  it('traverse: both from and to must be in-surface', async () => {
    const ok = { writer: 'agent', kind: 'traverse', from: '.street', to: '.craft', reason: 'x' } as const;
    const bad = { writer: 'agent', kind: 'traverse', from: '.street', to: '.private-note', reason: 'x' } as const;
    expect(await guardAgentEvent(ENV, ok)).toMatchObject({ allowed: true });
    expect(verdict(await guardAgentEvent(ENV, bad))).toMatch(/outside Lumi's scope/);
  });

  it('review: no node — kind conformance only (reaction to a vetted proposal)', async () => {
    const review = { writer: 'agent', kind: 'review', agent: codename('review-a'), proposalId: 'g1', decision: 'approve', revision: 1 } as const;
    expect(await guardAgentEvent(ENV, review)).toMatchObject({ allowed: true });
  });

  it('token required: missing / invalid refused, caps must cover the kind', async () => {
    const full = await mint('room:family', ['propose', 'traverse', 'review', 'presence']);
    const proposeOnly = await mint('room:family', ['propose']);
    expect(verdict(await guardAgentEvent(ENV_TOKEN, propose('.street'), undefined))).toMatch(/missing Lumi capability token/);
    expect(verdict(await guardAgentEvent(ENV_TOKEN, propose('.street'), 'not-a-token'))).toMatch(/invalid Lumi capability token/);
    expect(await guardAgentEvent(ENV_TOKEN, propose('.street'), full)).toMatchObject({ allowed: true });
    const traverse = { writer: 'agent', kind: 'traverse', from: '.street', to: '.craft', reason: 'x' } as const;
    expect(verdict(await guardAgentEvent(ENV_TOKEN, traverse, proposeOnly))).toMatch(/lacks cap/);
  });

  it('token requirement is rollout-safe: observe records would-refuse and allows', async () => {
    const ENV_OBS_TOKEN = { LUMI_ENFORCEMENT: 'observe' as const, LUMI_REQUIRE_TOKEN: 'true' };
    const v = await guardAgentEvent(ENV_OBS_TOKEN, propose('.street'), undefined);
    expect(v.allowed).toBe(true);
    expect(v.reason).toMatch(/missing Lumi capability token/);
    expect(v.mode).toBe('observe');
  });

  it('session cap reaches the PIP via the LOOM_SSE_URL fallback when no service binding', async () => {
    vi.stubGlobal('fetch', async () => ({ json: async () => ({ allowed: false, count: 9, max: 8 }) }) as unknown as Response);
    try {
      // No LOOM_SSE binding — the guard falls back to LOOM_SSE_URL + the header.
      const ENV = { LUMI_ENFORCEMENT: 'enforce' as const, LOOM_SSE_URL: 'https://loom-sse.local', LOOM_INTERNAL_SECRET: 's3cret' };
      const v = await guardAgentEvent(ENV, propose('.street'));
      expect(v.allowed).toBe(false);
      expect(v.reason).toMatch(/session cap of 8 proposals reached/);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('PIP unreachable fails open with an auditable observation (both modes)', async () => {
    vi.stubGlobal('fetch', async () => { throw new Error('PIP down'); });
    try {
      // Cap checks fail OPEN + audit (identity stays fail-closed). A transient
      // PIP blip must not refuse every agent proposal (self-inflicted outage).
      const ENV_ENFORCE = { LUMI_ENFORCEMENT: 'enforce' as const, LOOM_SSE_URL: 'https://loom-sse.local', LOOM_INTERNAL_SECRET: 's' };
      const v = await guardAgentEvent(ENV_ENFORCE, propose('.street'));
      expect(v.allowed).toBe(true);
      expect(v.reason).toMatch(/session PIP unreachable/);
      expect(v.mode).toBe('observe');
      const ENV_OBSERVE = { LUMI_ENFORCEMENT: 'observe' as const, LOOM_SSE_URL: 'https://loom-sse.local', LOOM_INTERNAL_SECRET: 's' };
      const o = await guardAgentEvent(ENV_OBSERVE, propose('.street'));
      expect(o.allowed).toBe(true);
      expect(o.reason).toMatch(/session PIP unreachable/);
      expect(o.mode).toBe('observe');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('human events pass through untouched', async () => {
    const human = { writer: 'human', kind: 'approve', proposal: 'g1' } as const;
    expect(await guardAgentEvent(ENV_TOKEN, human)).toMatchObject({ allowed: true });
  });

  it('session cap: enforced via the PIP (per-session DO) when enforcement on', async () => {
    const pipe = (response: { allowed: boolean; count: number; max: number }): ServiceFetch =>
      ({ fetch: async () => ({ json: async () => response }) as unknown as Response });
    const ENV_SESSION = { LUMI_ENFORCEMENT: 'enforce' as const, LOOM_SSE: pipe({ allowed: false, count: 9, max: 8 }) };
    const v = await guardAgentEvent(ENV_SESSION, propose('.street'));
    expect(v.allowed).toBe(false);
    expect(v.reason).toMatch(/session cap of 8 proposals reached/);
    const ENV_SESSION_OK = { LUMI_ENFORCEMENT: 'enforce' as const, LOOM_SSE: pipe({ allowed: true, count: 3, max: 8 }) };
    expect(await guardAgentEvent(ENV_SESSION_OK, propose('.street'))).toMatchObject({ allowed: true });
    // Non-propose agent kinds are not counted against the session cap.
    const traverse = { writer: 'agent', kind: 'traverse', from: '.street', to: '.craft', reason: 'x' } as const;
    expect(await guardAgentEvent(ENV_SESSION, traverse)).toMatchObject({ allowed: true });
  });

  it('observe mode session cap: peek (no increment) reports would-refuse, allows', async () => {
    const pipe = (response: { allowed: boolean; count: number; max: number }): ServiceFetch =>
      ({ fetch: async () => ({ json: async () => response }) as unknown as Response });
    const ENV_OBS = { LUMI_ENFORCEMENT: 'observe' as const, LOOM_SSE: pipe({ allowed: false, count: 8, max: 8 }) };
    const v = await guardAgentEvent(ENV_OBS, propose('.street'));
    expect(v.allowed).toBe(true);
    expect(v.reason).toMatch(/session cap of 8 proposals reached/);
    expect(v.mode).toBe('observe');
  });
});

describe('refusals sidecar chain (JCS)', () => {
  const row = (seq: number, reason: string): RefusalRecord => ({
    seq,
    ts: `2026-09-22T00:0${seq}:00Z`,
    mode: 'enforce',
    session: 'room:family',
    agent: codename('lumi-agent'),
    kind: 'propose',
    node: '.private-note',
    reason,
    prev_hash: '',
  });

  it('the refusal chain reuses the events canonicalizer and verifies intact', async () => {
    const records = [row(1, 'a'), row(2, 'b'), row(3, 'c')];
    // Link the chain the way recordRefusal does: each row's prev_hash is the
    // JCS hash of the previous row (genesis links to the sentinel).
    records[0].prev_hash = '';
    records[1].prev_hash = (await verifyChain(records.slice(0, 1).map(refusalToChainRecord))).head;
    records[2].prev_hash = (await verifyChain(records.slice(0, 2).map(refusalToChainRecord))).head;
    const verdict = await verifyChain(records.map(refusalToChainRecord));
    expect(verdict.valid).toBe(true);
    expect(verdict.head.length).toBe(64);
  });

  it('a tampered refusal row breaks the chain at that row', async () => {
    const records = [row(1, 'a'), row(2, 'b'), row(3, 'c')];
    records[1].prev_hash = (await verifyChain(records.slice(0, 1).map(refusalToChainRecord))).head;
    records[2].prev_hash = (await verifyChain(records.slice(0, 2).map(refusalToChainRecord))).head;
    const tampered = { ...records[1], reason: 'tampered' };
    const chain = records.map(refusalToChainRecord);
    chain[1] = refusalToChainRecord(tampered);
    const verdict = await verifyChain(chain);
    expect(verdict.valid).toBe(false);
    // The tampered row (seq 2) still matches its own predecessor; the break
    // surfaces at the first affected record — the one whose prev_hash no
    // longer matches the tampered row's hash (seq 3).
    expect(verdict.brokenAt).toBe(3);
  });
});