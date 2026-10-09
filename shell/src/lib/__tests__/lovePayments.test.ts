import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildReceiveLink,
  parseReceiveLink,
  amountFromReceiveLink,
  enqueuePaymentRequest,
  getPaymentRequests,
  fulfillPaymentRequest,
  clearPaymentRequests,
  sendLove,
} from '../lovePayments';
import { getLoveEngine } from '../loveEngine';

describe('lovePayments — receive links', () => {
  it('builds and round-trips a p31://receive link', () => {
    const link = buildReceiveLink('did:key:z6Mkabc', 4.5, 'sundries');
    expect(link.startsWith('p31://receive?')).toBe(true);
    const parsed = parseReceiveLink(link);
    expect(parsed).toEqual({ did: 'did:key:z6Mkabc', amount: 4.5, note: 'sundries' });
  });

  it('builds a link without a note', () => {
    const link = buildReceiveLink('did:key:z6Mkabc', 2);
    const parsed = parseReceiveLink(link);
    expect(parsed?.note).toBeUndefined();
    expect(parsed?.amount).toBe(2);
  });

  it('returns null for malformed or non-p31 links', () => {
    expect(parseReceiveLink('not-a-link')).toBeNull();
    expect(parseReceiveLink('p31://send?did=x')).toBeNull();
    expect(parseReceiveLink('p31://receive?did=x&amount=abc')).toBeNull();
    expect(parseReceiveLink('p31://receive?did=x&amount=0')).toBeNull();
  });

  it('amountFromReceiveLink extracts the amount', () => {
    expect(amountFromReceiveLink(buildReceiveLink('did:key:z6Mkabc', 7))).toBe(7);
  });
});

describe('lovePayments — local payment request queue', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('enqueues and lists requests', () => {
    const req = enqueuePaymentRequest({ fromDid: 'did:key:a', amount: 3 });
    const list = getPaymentRequests();
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe('pending');
    expect(list[0].amount).toBe(3);
    expect(req.id).toBe(list[0].id);
  });

  it('fulfills a request by id', () => {
    const req = enqueuePaymentRequest({ fromDid: 'did:key:a', amount: 5 });
    fulfillPaymentRequest(req.id);
    expect(getPaymentRequests()[0].status).toBe('fulfilled');
  });

  it('clears all requests', () => {
    enqueuePaymentRequest({ fromDid: 'did:key:a', amount: 1 });
    clearPaymentRequests();
    expect(getPaymentRequests()).toHaveLength(0);
  });
});

describe('lovePayments — sendLove', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('rejects a non-DID recipient', () => {
    const res = sendLove('bob', 1);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/did/);
  });

  it('rejects non-positive amounts', () => {
    const res = sendLove('did:key:bob', 0);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/positive/);
  });

  it('records a spend against the local performance pool when balance exists', () => {
    const engine = getLoveEngine();
    const before = engine.wallet.availableBalance;
    const res = sendLove('did:key:bob', 1, 'thank you');
    if (before >= 1) {
      expect(res.ok).toBe(true);
      expect(engine.wallet.availableBalance).toBeCloseTo(before - 1);
      const spends = engine.spends;
      expect(spends[spends.length - 1].type).toBe('FOUNDING_GIFT');
      expect(spends[spends.length - 1].recipient).toBe('did:key:bob');
    } else {
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/balance/i);
    }
  });
});
