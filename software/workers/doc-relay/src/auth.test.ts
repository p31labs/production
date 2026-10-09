/**
 * doc-relay PQC capability-token authorization.
 */

import { describe, it, expect } from 'vitest';
import {
  generateCompositeKeyPair,
  mintCapabilityToken,
  base64urlEncode,
  compositePublicKey,
  type CapabilityClaims,
} from '@p31ca/sovereign-primitives';
import { authorizeRequest, extractTokenFromRequest, negotiateWebSocketProtocol } from './auth';

function claims(over: Partial<CapabilityClaims> = {}): CapabilityClaims {
  const iat = Date.now();
  return {
    iss: 'did:key:z6Mkphos',
    aud: 'p31-doc-relay',
    room: 'doc_abc',
    caps: ['read', 'write', 'awareness'],
    iat,
    exp: iat + 60_000,
    ...over,
  };
}

async function tokenFor(room: string, keys: Awaited<ReturnType<typeof generateCompositeKeyPair>>): Promise<string> {
  const pub = compositePublicKey(keys);
  return mintCapabilityToken(
    claims({ room, pk: { ed25519: base64urlEncode(pub.ed25519), mlDsa65: base64urlEncode(pub.mlDsa65) } }),
    keys,
  );
}

describe('authorizeRequest', () => {
  it('accepts a valid self-contained token for the room', async () => {
    const keys = await generateCompositeKeyPair();
    const token = await tokenFor('doc_abc', keys);
    const room = await authorizeRequest({ url: `https://relay.test/doc_abc?token=${token}` });
    expect(room).toBe('doc_abc');
  });

  it('rejects a missing token', async () => {
    expect(await authorizeRequest({ url: 'https://relay.test/doc_abc' })).toBeNull();
  });

  it('rejects a token bound to a different room', async () => {
    const keys = await generateCompositeKeyPair();
    const token = await tokenFor('doc_other', keys);
    expect(await authorizeRequest({ url: `https://relay.test/doc_abc?token=${token}` })).toBeNull();
  });

  it('rejects an expired token', async () => {
    const keys = await generateCompositeKeyPair();
    const pub = compositePublicKey(keys);
    const token = await mintCapabilityToken(
      claims({ room: 'doc_abc', exp: Date.now() - 60_000, pk: { ed25519: base64urlEncode(pub.ed25519), mlDsa65: base64urlEncode(pub.mlDsa65) } }),
      keys,
    );
    expect(await authorizeRequest({ url: `https://relay.test/doc_abc?token=${token}` })).toBeNull();
  });

  it('rejects a token without the relay capabilities', async () => {
    const keys = await generateCompositeKeyPair();
    const pub = compositePublicKey(keys);
    const token = await mintCapabilityToken(
      claims({ room: 'doc_abc', caps: ['read'], pk: { ed25519: base64urlEncode(pub.ed25519), mlDsa65: base64urlEncode(pub.mlDsa65) } }),
      keys,
    );
    expect(await authorizeRequest({ url: `https://relay.test/doc_abc?token=${token}` })).toBeNull();
  });

  it('rejects a tampered token', async () => {
    const keys = await generateCompositeKeyPair();
    const token = await tokenFor('doc_abc', keys);
    expect(await authorizeRequest({ url: `https://relay.test/doc_abc?token=${token}x` })).toBeNull();
  });
});

describe('token transport', () => {
  it('extracts the token from a query param', () => {
    expect(extractTokenFromRequest({ url: 'https://relay.test/r?token=abc' })).toBe('abc');
  });

  it('extracts the token from the sec-websocket-protocol subprotocol', () => {
    const req = {
      url: 'https://relay.test/r',
      headers: { get: () => `yjs, p31-cap-abc123` },
    };
    expect(extractTokenFromRequest(req)).toBe('abc123');
  });

  it('returns null when no token is present', () => {
    expect(extractTokenFromRequest({ url: 'https://relay.test/r' })).toBeNull();
    expect(
      extractTokenFromRequest({ url: 'https://relay.test/r', headers: { get: () => 'yjs' } }),
    ).toBeNull();
  });

  it('authorizes a request via the subprotocol token', async () => {
    const keys = await generateCompositeKeyPair();
    const token = await tokenFor('doc_abc', keys);
    const req = {
      url: 'https://relay.test/doc_abc',
      headers: { get: () => `yjs, p31-cap-${token}` },
    };
    expect(await authorizeRequest(req)).toBe('doc_abc');
  });

  it('negotiates the token subprotocol when present, else the first requested', () => {
    expect(negotiateWebSocketProtocol({ url: 'x', headers: { get: () => 'yjs, p31-cap-tok' } })).toBe(
      'p31-cap-tok',
    );
    expect(negotiateWebSocketProtocol({ url: 'x', headers: { get: () => 'yjs' } })).toBe('yjs');
    expect(negotiateWebSocketProtocol({ url: 'x' })).toBeUndefined();
  });
});