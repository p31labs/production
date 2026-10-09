#!/usr/bin/env node
/**
 * test-loom-wimse.mjs — WIMSE audit-record + DSSE envelope checks.
 * Verifies toWimseAuditRecord + deriveAgreement against the
 * draft-gilda-wimse-agent-audit-record-00 contract, and the DSSE sign/verify
 * round-trip (in-toto predicate signed inside a DSSE envelope).
 */
import assert from 'node:assert/strict'
import { toWimseAuditRecord, deriveAgreement } from '../dist/loom/wimse-audit-record.js'
import { toInTotoStatement, signDsse, verifyDsse, pae, DSSE_PAYLOAD_TYPE, WIMSE_PREDICATE_TYPE } from '../dist/loom/wimse-dsse.js'
import { generateSigningKeyPair } from '@p31ca/sovereign-primitives/post-quantum'

// allow + committed effect → match
const allowMatch = toWimseAuditRecord({
  record: { seq: 14, ts: '2026-09-22T18:49:47Z', data: '{"writer":"agent","kind":"propose"}', prev_hash: 'abc' },
  decision: { decision: 'allow', policy: 'scope.surfaces', reason: 'in-scope propose' },
  agentId: 'did:key:z6Mk-lumi',
  effectObserved: true,
})
assert.equal(allowMatch.agreement, 'match', 'allow + observed effect = match')
assert.equal(allowMatch.spec, 'draft-gilda-wimse-agent-audit-record-00')
assert.equal(allowMatch.canonicalization, 'RFC8785-JCS')
assert.equal(allowMatch.chain.prev_hash, 'abc')

// refuse + no effect → match
const refuseMatch = toWimseAuditRecord({
  record: { seq: 15, ts: '2026-09-22T18:50:00Z', data: '{"kind":"refusal"}', prev_hash: 'def' },
  decision: { decision: 'refuse', policy: 'session-cap', reason: 'proposal cap exceeded' },
  agentId: 'did:key:z6Mk-lumi',
  effectObserved: false,
})
assert.equal(refuseMatch.agreement, 'match', 'refuse + no effect = match')

// allow but no effect observed → mismatch (the gate failed closed)
const drift = toWimseAuditRecord({
  record: { seq: 16, ts: '2026-09-22T18:50:10Z', data: '{}', prev_hash: 'ghi' },
  decision: { decision: 'allow' },
  agentId: 'did:key:z6Mk-lumi',
  effectObserved: false,
})
assert.equal(drift.agreement, 'mismatch', 'allow + no effect = mismatch')

// deriveAgreement unit
assert.equal(deriveAgreement('allow', true), 'match')
assert.equal(deriveAgreement('refuse', false), 'match')
assert.equal(deriveAgreement('refuse', true), 'mismatch')

// ── DSSE envelope round-trip ──
const keyPair = await generateSigningKeyPair()
const keyid = 'did:key:z6Mk-loom-test'

// PAE canonical shape (DSSE spec §4): "DSSEv1 <len> <type> <len> <payload> <payload>"
const enc = new TextEncoder()
const sample = enc.encode('{"x":1}')
const samplePae = pae(DSSE_PAYLOAD_TYPE, sample)
const header = new TextDecoder().decode(samplePae.slice(0, 40))
assert.ok(header.startsWith(`DSSEv1 ${DSSE_PAYLOAD_TYPE.length} ${DSSE_PAYLOAD_TYPE} `), 'PAE header shape')

// Wrap a WIMSE record in an in-toto Statement and sign it into a DSSE envelope.
const stmt = toInTotoStatement(allowMatch, `loom:seq:${allowMatch.effect.seq}`, 'e3b0c44298fc1c149afbf4c8996fb924')
const envelope = await signDsse(stmt, keyPair, keyid)

assert.equal(envelope.payloadType, DSSE_PAYLOAD_TYPE, 'envelope payloadType')
assert.equal(envelope.signatures.length, 1, 'one signature')
assert.ok(envelope.signatures[0].sig.length > 0, 'signature present')

// Decode the envelope payload back to an in-toto Statement.
const decoded = JSON.parse(new TextDecoder().decode(
  Uint8Array.from(atob(envelope.payload), (c) => c.charCodeAt(0)),
))
assert.equal(decoded.predicateType, WIMSE_PREDICATE_TYPE, 'in-toto predicate type')
assert.equal(decoded.subject[0].name, `loom:seq:${allowMatch.effect.seq}`, 'subject name')
assert.equal(decoded.predicate.agreement, 'match', 'predicate agreement survives the envelope')

// Verify the envelope against the public key — must succeed.
const ok = await verifyDsse(envelope, { classical: keyPair.classical.publicKey, pqc: keyPair.pqc.publicKey })
assert.equal(ok, true, 'DSSE envelope verifies')

// Tampering with the payload must fail verification.
const tampered = { ...envelope, payload: envelope.payload.slice(0, -2) + 'AA' }
const bad = await verifyDsse(tampered, { classical: keyPair.classical.publicKey, pqc: keyPair.pqc.publicKey })
assert.equal(bad, false, 'tampered payload rejected')

console.log('✅ loom wimse audit-record + DSSE envelope — decision/effect/agreement/sign/verify/tamper all pass.')