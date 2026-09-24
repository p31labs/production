import { describe, expect, it, beforeEach } from 'vitest'
import { appendSBT, computeSbtHash, hasSbt, loadSbtChain, verifySbtChain } from './sbt'

const MEMBER = 'test-member'
const DID = 'did:key:z6Mktest'

beforeEach(() => {
  localStorage.clear()
})

describe('sbt — chain integrity', () => {
  it('mints a genesis block with prevHash "genesis"', async () => {
    const sbt = await appendSBT(MEMBER, DID, 'achievement', 'First', 'desc')
    expect(sbt.prevHash).toBe('genesis')
    expect(sbt.hash).toHaveLength(64)
  })

  it('links each new block to the previous hash', async () => {
    const a = await appendSBT(MEMBER, DID, 'achievement', 'A', 'a')
    const b = await appendSBT(MEMBER, DID, 'achievement', 'B', 'b')
    expect(b.prevHash).toBe(a.hash)
  })

  it('verifies a well-formed chain', async () => {
    await appendSBT(MEMBER, DID, 'achievement', 'A', 'a')
    await appendSBT(MEMBER, DID, 'achievement', 'B', 'b')
    expect(await verifySbtChain(MEMBER)).toBe(true)
  })

  it('detects a tampered chain', async () => {
    await appendSBT(MEMBER, DID, 'achievement', 'A', 'a')
    const chain = loadSbtChain(MEMBER)
    chain[0]!.title = 'Tampered'
    localStorage.setItem(`p31:sbt:${MEMBER}`, JSON.stringify(chain))
    expect(await verifySbtChain(MEMBER)).toBe(false)
  })

  it('hasSbt checks by title idempotently', async () => {
    expect(hasSbt(MEMBER, 'First')).toBe(false)
    await appendSBT(MEMBER, DID, 'achievement', 'First', 'desc')
    expect(hasSbt(MEMBER, 'First')).toBe(true)
  })

  it('computeSbtHash is deterministic', async () => {
    const draft = {
      id: 'x',
      kind: 'achievement' as const,
      title: 'T',
      memberId: MEMBER,
      did: DID,
      mintedAt: 123,
      prevHash: 'genesis',
    }
    expect(await computeSbtHash(draft)).toBe(await computeSbtHash(draft))
  })
})