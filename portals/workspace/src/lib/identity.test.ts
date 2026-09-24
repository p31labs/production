import { describe, expect, it } from 'vitest'
import { shortDid } from './identity'

describe('identity — display helpers', () => {
  it('shortens a long did:key', () => {
    const did = 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK'
    const short = shortDid(did)
    expect(short.startsWith('did:key:z6Mk')).toBe(true)
    expect(short.endsWith('doK')).toBe(true)
    expect(short.length).toBeLessThan(did.length)
  })

  it('leaves a short did unchanged', () => {
    expect(shortDid('did:key:z6')).toBe('did:key:z6')
  })
})