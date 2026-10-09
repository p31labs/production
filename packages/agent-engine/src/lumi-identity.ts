/**
 * @file lumi-identity.ts — Lumi as an identifiable, scoped, auditable agent
 * principal (the NIST AI Agent Standards posture, made concrete).
 *
 * Lumi is not a generic model — it is an agent with a persistent identity
 * (a `did:key`), a PQC capability token (composite Ed25519 + ML-DSA-65, the
 * same `@p31ca/sovereign-primitives` machinery as the doc-relay), and a scope
 * declaration encoding the co-presence invariant: Lumi proposes, the human
 * decides; Lumi never emits a human-only kind.
 */

import {
  base64urlEncode,
  compositePublicKey,
  generateCompositeKeyPair,
  mintCapabilityToken,
  verifySelfContainedCapabilityToken,
  type CompositeKeyPair,
  type CompositePublicKey,
} from '@p31ca/sovereign-primitives';
import type { AgentScopeDeclaration, TokenVerifier } from '@p31ca/canon/loom/scope';
import { DEFAULT_LUMI_SCOPE as CANON_DEFAULT_SCOPE } from '@p31ca/canon/loom/scope';

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(bytes: Uint8Array): string {
  let num = BigInt(0);
  for (let i = 0; i < bytes.length; i++) num = (num << 8n) | BigInt(bytes[i]);
  let encoded = '';
  while (num > 0n) {
    encoded = BASE58_ALPHABET[Number(num % 58n)] + encoded;
    num = num / 58n;
  }
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) encoded = '1' + encoded;
  return encoded || '1';
}

function didKeyFromEd25519(pub: Uint8Array): string {
  const multicodec = new Uint8Array([0xed, 0x01]);
  const raw = new Uint8Array(multicodec.length + pub.length);
  raw.set(multicodec, 0);
  raw.set(pub, multicodec.length);
  return `did:key:z${base58Encode(raw)}`;
}

/**
 * What Lumi may do — the co-presence scope declaration. SINGLE SOURCE is
 * @p31ca/canon's `AgentScopeDeclaration`; this module re-exports it so the
 * identity layer and the enforcement layer cannot drift.
 */
export type LumiScopeDeclaration = AgentScopeDeclaration;
export type { AgentScopeDeclaration };

/** Canonical default — single source is @p31ca/canon's DEFAULT_LUMI_SCOPE
 *  (values AND shape); this module re-exports it so identity and enforcement
 *  cannot drift. */
export const DEFAULT_LUMI_SCOPE: LumiScopeDeclaration = CANON_DEFAULT_SCOPE;

export interface LumiAgentIdentity {
  did: string;
  name: 'lumi';
  scope: LumiScopeDeclaration;
  createdAt: number;
}

export interface LumiKeyMaterial {
  keys: CompositeKeyPair;
  identity: LumiAgentIdentity;
}

/** Creates Lumi's identity: an Ed25519 did:key + composite PQC keypair. */
export async function createLumiIdentity(
  scope: LumiScopeDeclaration = DEFAULT_LUMI_SCOPE,
): Promise<LumiKeyMaterial> {
  const keys = await generateCompositeKeyPair();
  const did = didKeyFromEd25519(keys.ed25519.publicKey);
  const identity: LumiAgentIdentity = { did, name: 'lumi', scope, createdAt: Date.now() };
  return { keys, identity };
}

/**
 * Mints a self-contained PQC capability token binding Lumi to a room/session
 * with its delegated scopes — the agent-identity credential a verifier (the
 * Loom gate, a relay) checks before accepting Lumi's actions.
 */
export async function mintLumiCapability(
  identity: LumiAgentIdentity,
  keys: CompositeKeyPair,
  room: string,
  caps: string[] = ['propose', 'review'],
): Promise<string> {
  const pub = compositePublicKey(keys);
  const iat = Date.now();
  return mintCapabilityToken(
    {
      iss: identity.did,
      aud: 'p31-loom',
      room,
      caps,
      pk: {
        ed25519: base64urlEncode(pub.ed25519),
        mlDsa65: base64urlEncode(pub.mlDsa65),
      },
      iat,
      exp: iat + 15 * 60 * 1000,
    },
    keys,
  );
}

/** Verifies a Lumi capability token (self-contained, fail-closed). */
export async function verifyLumiCapability(
  token: string,
  opts: { room?: string; caps?: string[] } = {},
): Promise<boolean> {
  const claims = await verifySelfContainedCapabilityToken(token, {
    expectAud: 'p31-loom',
    expectRoom: opts.room,
    requireCaps: opts.caps,
  });
  return claims !== null;
}

/**
 * Builds a ScopeGuard-compatible TokenVerifier for Lumi. The token's `caps`
 * claims drive the decision: the guard refuses any action whose kind is not in
 * the token's caps (caps authenticate; session policies authorize). Fail-closed.
 */
export async function makeLumiTokenVerifier(room?: string): Promise<TokenVerifier> {
  return async (token: string) => {
    const claims = await verifySelfContainedCapabilityToken(token, {
      expectAud: 'p31-loom',
      expectRoom: room,
    });
    if (!claims) return { ok: false };
    return { ok: true, caps: claims.caps };
  };
}

export type { CompositePublicKey };