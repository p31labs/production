#!/usr/bin/env node
/**
 * mint-forum-token.mjs — mint an AIC-JWT capability token for the forum.
 *
 * The forum-api verifies every write with verifySelfContainedCapabilityToken,
 * expecting audience `FORUM_AUD` (default "forum.p31ca.org"). This helper
 * mints a token the workspace portal (or any client) sends as:
 *
 *   Authorization: Bearer <token>
 *
 * The token is SELF-CONTAINED: it carries its own composite public key, so no
 * shared key registry is needed — the verifier checks possession of the private
 * key bound to the embedded public keys, the audience, and the expiry.
 *
 * Usage:
 *   node scripts/mint-forum-token.mjs [did] [room] [caps...]
 *
 *   did   — issuer did:key (defaults to a fresh keypair's generated DID)
 *   room  — resource id (default "forum")
 *   caps  — capabilities (default ["read","write"])
 *
 * Prints the compact token on stdout. The portal should mint short-lived
 * tokens (15 min) scoped to its own did and reuse them until near-expiry.
 *
 * For the browser, the portal must hold the private key. Do NOT embed a
 * long-lived private key in client code — the intended flow is a small
 * Worker (or the workspace's identity surface) that mints on the client's
 * behalf, or a hardware/WebAuthn-bound key. This helper is the reference.
 */

import { generateDID } from '@p31ca/sovereign-primitives';
import { generateCompositeKeyPair, compositePublicKey, base64urlEncode } from '@p31ca/sovereign-primitives/composite';
import { mintCapabilityToken } from '@p31ca/sovereign-primitives/capability-token';

const [didArg, roomArg = 'forum', ...capsArg] = process.argv.slice(2);
const caps = capsArg.length ? capsArg : ['read', 'write'];

// Fixed identity: the DID passed in is the durable one. The keypair is
// ephemeral per mint (self-contained token embeds its public keys), so the
// DID is what must persist across calls — the same DID means the same author.
const keys = await generateCompositeKeyPair();
const did = didArg ?? await generateDID('key', keys);

// IMPORTANT: exp/iat are MILLISECONDS — the package's parseCapabilityToken
// compares `opts.now ?? Date.now()` (ms) against claims.exp. Seconds here
// would make every token permanently expired (Date.now() > exp is always
// true by ~1000×). See packages/sovereign-primitives/src/capabilityToken.ts
// parseCapabilityToken + its tests (iat = Date.now(), exp = iat + 60000).
const nowMs = Date.now();
// Self-contained token: embed the composite public keys so the verifier
// (verifySelfContainedCapabilityToken) can validate without a key registry.
const pub = compositePublicKey(keys);
const claims = {
  iss: did,
  sub: did,
  aud: 'forum.p31ca.org', // MUST match FORUM_AUD in forum-api/wrangler.toml
  room: roomArg,
  caps,
  pk: { ed25519: base64urlEncode(pub.ed25519), mlDsa65: base64urlEncode(pub.mlDsa65) },
  iat: nowMs,
  exp: nowMs + 15 * 60 * 1000, // 15 minutes in ms — short-lived, fail-closed on expiry
};

const token = await mintCapabilityToken(claims, keys);
console.log(token);
console.error(`did: ${did}`);
console.error(`aud: ${claims.aud} · room: ${roomArg} · caps: ${caps.join(',')} · exp: ${new Date(claims.exp).toISOString()}`);