import {
  generateCompositeKeyPair,
  mintCapabilityToken,
  compositePublicKey,
  compositeKeyFingerprint,
  verifySelfContainedCapabilityToken,
} from '@p31/sovereign-primitives'
import { base64urlEncode } from '@p31/sovereign-primitives'

/**
 * Session capability-token minting for the workspace.
 *
 * Real P31 authorization, not a demo: on caregiver elevation, the workspace
 * mints a self-contained PQCAP (composite Ed25519 + ML-DSA-65) capability
 * token scoped to the session. The token carries its own public key, so it
 * can be verified without a key registry — the token IS the capability.
 * Held in memory (never localStorage), verified fail-closed.
 *
 * ML-DSA-65 is NIST FIPS 204 — the post-quantum signature the Loom and
 * Lumi identity use.
 */
export interface SessionCapability {
  token: string
  fingerprint: string
  aud: string
  caps: string[]
  room: string
}

export const SESSION_AUD = 'p31-workspace'
export const SESSION_ROOM = 'workspace-session'
export const SESSION_CAPS = ['read', 'write', 'elevate']
const SESSION_TTL_MS = 15 * 60 * 1000

/** Mint a self-contained session capability token (memory-only credential). */
export async function mintSessionCapability(
  iss: string,
  aud: string = SESSION_AUD,
  room: string = SESSION_ROOM,
  caps: string[] = SESSION_CAPS,
): Promise<SessionCapability> {
  const keys = await generateCompositeKeyPair()
  const pk = compositePublicKey(keys)
  const iat = Date.now()
  const token = await mintCapabilityToken(
    {
      iss,
      aud,
      room,
      caps,
      pk: { ed25519: base64urlEncode(pk.ed25519), mlDsa65: base64urlEncode(pk.mlDsa65) },
      iat,
      exp: iat + SESSION_TTL_MS,
    },
    keys,
  )
  const fingerprint = await compositeKeyFingerprint(pk)
  return { token, fingerprint, aud, room, caps }
}

/** Verify a self-contained session capability token fail-closed. */
export async function verifySessionCapability(
  token: string,
  aud: string = SESSION_AUD,
  caps: string[] = SESSION_CAPS,
): Promise<boolean> {
  try {
    const claims = await verifySelfContainedCapabilityToken(token, {
      expectAud: aud,
      requireCaps: caps,
    })
    return claims !== null
  } catch {
    return false
  }
}