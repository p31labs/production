import { describe, it, expect } from 'vitest'
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js'

// Directly test the noble round-trip the module relies on, with the exact
// call order pqc-browser uses: sign(msg, sk) / verify(sig, msg, pk).
describe('PQC identity round-trip', () => {
  it('signs and verifies with ML-DSA-65', () => {
    const kp = ml_dsa65.keygen()
    const msg = new TextEncoder().encode('p31-forge-document-manifest')
    const sig = ml_dsa65.sign(msg, kp.secretKey)
    expect(ml_dsa65.verify(sig, msg, kp.publicKey)).toBe(true)
  })

  it('rejects a tampered message', () => {
    const kp = ml_dsa65.keygen()
    const msg = new TextEncoder().encode('p31-forge-document-manifest')
    const sig = ml_dsa65.sign(msg, kp.secretKey)
    const tampered = new TextEncoder().encode('tampered')
    expect(ml_dsa65.verify(sig, tampered, kp.publicKey)).toBe(false)
  })

  it('correctly orders args (sig first, then msg, then pubkey)', () => {
    const kp = ml_dsa65.keygen()
    const msg = new TextEncoder().encode('order-check')
    const sig = ml_dsa65.sign(msg, kp.secretKey)
    // Wrong order must fail — this guards against the bug we caught.
    expect(ml_dsa65.verify(new TextEncoder().encode('order-check'), sig, kp.publicKey)).toBe(false)
  })
})