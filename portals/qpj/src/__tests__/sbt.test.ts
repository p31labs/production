import { describe, it, expect, beforeEach } from 'vitest';
import { appendSBT, verifyChain, listSBTs } from '../lib/sbt';

describe('sbt — chain integrity', () => {
  const DID = 'did:key:ztestsbtchain';

  beforeEach(() => {
    localStorage.clear();
  });

  it('first block has prevHash = null', async () => {
    const block = await appendSBT(DID, 'credential', 'Claimed Space', 'first');
    expect(block.blockNumber).toBe(0);
    expect(block.prevHash).toBeNull();
    expect(block.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('second block links to the first', async () => {
    const first = await appendSBT(DID, 'credential', 'Claimed Space', 'first');
    const second = await appendSBT(DID, 'affiliation', 'First Peer', 'second');
    expect(second.blockNumber).toBe(1);
    expect(second.prevHash).toBe(first.hash);
  });

  it('verifyChain confirms a valid chain', async () => {
    await appendSBT(DID, 'credential', 'A', 'a');
    await appendSBT(DID, 'affiliation', 'B', 'b');
    await appendSBT(DID, 'achievement', 'C', 'c');
    const { valid, brokenAt } = await verifyChain(DID);
    expect(valid).toBe(true);
    expect(brokenAt).toBeNull();
  });

  it('verifyChain detects tampering', async () => {
    await appendSBT(DID, 'credential', 'A', 'a');
    await appendSBT(DID, 'affiliation', 'B', 'b');
    const chain = JSON.parse(localStorage.getItem(`qpj:sbt:chain:${DID}`)!);
    chain.blocks[1].name = 'Tampered';
    localStorage.setItem(`qpj:sbt:chain:${DID}`, JSON.stringify(chain));
    const { valid, brokenAt } = await verifyChain(DID);
    expect(valid).toBe(false);
    expect(brokenAt).toBe(1);
  });

  it('chains are per-DID', async () => {
    await appendSBT('did:key:zone', 'credential', 'A', 'a');
    await appendSBT('did:key:ztwo', 'credential', 'B', 'b');
    expect(listSBTs('did:key:zone')).toHaveLength(1);
    expect(listSBTs('did:key:ztwo')).toHaveLength(1);
  });
});
