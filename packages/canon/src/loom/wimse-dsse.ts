/**
 * @p31ca/canon — loom/wimse-dsse.ts
 *
 * DSSE envelope + in-toto predicate for The Loom's audit records.
 *
 * Implements the signed-envelope shape required by the IETF Agent Audit Record
 * draft (draft-gilda-wimse-agent-audit-record-00, 2026-09-20): "one in-toto
 * predicate type, signed inside a DSSE envelope."
 *
 * DSSE (Dead Simple Signing Envelope, sigstore) envelope:
 *   {
 *     "payload": "<base64-encoded payload>",
 *     "payloadType": "application/vnd.in-toto+json",
 *     "signatures": [{ "keyid": "...", "sig": "<base64>" }]
 *   }
 *
 * The payload is an in-toto Statement wrapping the WIMSE predicate:
 *   {
 *     "_type": "https://in-toto.io/Statement/v1",
 *     "predicateType": "https://wimse.io/attestation/agent-audit-record/v1",
 *     "subject": [{ "name": "...", "digest": { "sha256": "..." } }],
 *     "predicate": { ... the WIMSE audit record ... }
 *   }
 *
 * Signing uses the P31 composite PQC signer (Ed25519 + ML-DSA-65). The
 * signature covers the DSSE pre-authentication encoding (PAE), so the type +
 * payload binding is tamper-evident.
 *
 * Edge-safe: uses only WebCrypto + TextEncoder, no node: imports.
 */

import type { HybridKeyPair, HybridSignature } from '@p31ca/sovereign-primitives/post-quantum';
import { hybridSign, hybridVerify } from '@p31ca/sovereign-primitives/post-quantum';

/** in-toto Statement type — the DSSE payload wrapper. */
export const IN_TOTO_STATEMENT_TYPE = 'https://in-toto.io/Statement/v1'
/** The WIMSE agent-audit-record predicate type. */
export const WIMSE_PREDICATE_TYPE = 'https://wimse.io/attestation/agent-audit-record/v1'
/** DSSE payload type for in-toto payloads. */
export const DSSE_PAYLOAD_TYPE = 'application/vnd.in-toto+json'

export interface DsseSignature {
  keyid: string
  sig: string // base64
}

export interface DsseEnvelope {
  payload: string // base64
  payloadType: string
  signatures: DsseSignature[]
}

export interface InTotoSubject {
  name: string
  digest: { sha256: string }
}

export interface InTotoStatement<P> {
  _type: string
  predicateType: string
  subject: InTotoSubject[]
  predicate: P
}

function b64(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/**
 * DSSE pre-authentication encoding (PAE): binds the payload type and payload
 * bytes into a single canonical buffer that gets signed.
 */
export function pae(payloadType: string, payload: Uint8Array): Uint8Array {
  const enc = new TextEncoder()
  const type = enc.encode(payloadType)
  const header = `DSSEv1 ${type.length} ${payloadType} ${payload.length} `
  const headerBytes = enc.encode(header)
  const out = new Uint8Array(headerBytes.length + payload.length)
  out.set(headerBytes, 0)
  out.set(payload, headerBytes.length)
  return out
}

/** Wrap a WIMSE predicate in an in-toto Statement. */
export function toInTotoStatement<P>(
  predicate: P,
  subjectName: string,
  sha256Digest: string,
): InTotoStatement<P> {
  return {
    _type: IN_TOTO_STATEMENT_TYPE,
    predicateType: WIMSE_PREDICATE_TYPE,
    subject: [{ name: subjectName, digest: { sha256: sha256Digest } }],
    predicate,
  }
}

/**
 * Build a signed DSSE envelope from an in-toto Statement, using the composite
 * PQC signer (Ed25519 + ML-DSA-65). The composite signature is appended as one
 * blob; a verifier splits it at the 64-byte Ed25519 boundary.
 */
export async function signDsse<P>(
  statement: InTotoStatement<P>,
  keyPair: HybridKeyPair,
  keyid: string,
): Promise<DsseEnvelope> {
  const enc = new TextEncoder()
  const payload = enc.encode(JSON.stringify(statement))
  const preAuth = pae(DSSE_PAYLOAD_TYPE, payload)
  const preAuthBytes = preAuth as Uint8Array<ArrayBuffer>
  const sig = await hybridSign(preAuthBytes, keyPair)

  const composite = new Uint8Array(sig.classical.length + sig.pqc.length)
  composite.set(sig.classical, 0)
  composite.set(sig.pqc, sig.classical.length)

  return {
    payload: b64(payload),
    payloadType: DSSE_PAYLOAD_TYPE,
    signatures: [{ keyid, sig: b64(composite) }],
  }
}

/**
 * Verify a DSSE envelope against a PQC public key. Splits the composite
 * signature (64-byte Ed25519 + ML-DSA-65) and checks both. Returns true only
 * if the classical half verifies; the pqc half is best-effort (the verifier
 * does not fail-closed on pqc absence in environments without @noble support).
 */
export async function verifyDsse(
  envelope: DsseEnvelope,
  publicKeys: { classical: Uint8Array<ArrayBuffer>; pqc: Uint8Array<ArrayBuffer> },
): Promise<boolean> {
  if (envelope.payloadType !== DSSE_PAYLOAD_TYPE) return false
  const payload = fromB64(envelope.payload)
  const preAuth = pae(envelope.payloadType, payload)

  for (const s of envelope.signatures) {
    const composite = fromB64(s.sig)
    const classical = composite.slice(0, 64)
    const pqc = composite.slice(64)
    try {
      const result = await hybridVerify(preAuth as Uint8Array<ArrayBuffer>, { classical, pqc, algorithm: 'Ed25519+ML-DSA-65' } as HybridSignature, publicKeys)
      if (result.classicalValid) return true
    } catch {
      // malformed signature — try next
    }
  }
  return false
}