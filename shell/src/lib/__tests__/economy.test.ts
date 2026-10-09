import { describe, it, expect, beforeEach } from 'vitest';
import {
  useDualEconomyStore,
  computeBudget,
  GROSS_SPOONS,
  BORROW_INTEREST,
  type MorningAssessmentInput,
  type LedgerEntry,
} from '@p31ca/economy';

function fresh(): MorningAssessmentInput {
  return { medicationTaken: true, painLevel: 0, courtDay: false, fragile: false };
}

describe('dual economy — budget', () => {
  it('starts at full gross budget with no penalties', () => {
    const b = computeBudget(fresh(), { spent: 0, borrowed: 0 });
    expect(b.grossBudget).toBe(GROSS_SPOONS);
    expect(b.netBudget).toBe(GROSS_SPOONS);
    expect(b.tier).toBe('FULL');
  });

  it('applies morning penalties and drops tier', () => {
    const b = computeBudget(
      { medicationTaken: false, painLevel: 7, courtDay: true, fragile: true },
      { spent: 0, borrowed: 0 },
    );
    expect(b.netBudget).toBe(GROSS_SPOONS - 2 - 2 - 3 - 1);
    expect(b.remaining).toBe(b.netBudget);
  });

  it('computes STAND_DOWN tier at low remaining', () => {
    const b = computeBudget(
      { medicationTaken: false, painLevel: 8, courtDay: true, fragile: true },
      { spent: 9, borrowed: 0 },
    );
    expect(b.tier).toBe('STAND_DOWN');
  });
});

describe('dual economy — spend / borrow / regenerate', () => {
  beforeEach(() => {
    useDualEconomyStore.setState({
      budget: computeBudget(fresh(), { spent: 0, borrowed: 0 }),
      lifetimeKarma: 0,
      spoonTransactions: [],
      karmaAwards: [],
      _lastHash: 'genesis',
      _hasHydrated: true,
      did: 'did:key:test',
    });
  });

  it('spends spoons and rejects overspend', async () => {
    const ok = await useDualEconomyStore.getState().spendSpoons(4, 'zone_entry', 'Work session');
    expect(ok).toBe(true);
    expect(useDualEconomyStore.getState().budget.remaining).toBe(GROSS_SPOONS - 4);

    const over = await useDualEconomyStore.getState().spendSpoons(999, 'zone_entry', 'Too much');
    expect(over).toBe(false);
  });

  it('borrows with 1.5x tomorrow penalty', async () => {
    await useDualEconomyStore.getState().borrowSpoons(4, 'debug_session', 'Deep work');
    const s = useDualEconomyStore.getState();
    expect(s.budget.borrowed).toBe(4);
    expect(s.budget.remaining).toBe(GROSS_SPOONS + 4);
    expect(s.budget.tomorrowPenalty).toBe(Math.round(4 * BORROW_INTEREST));
  });

  it('regenerates up to net budget, never above', async () => {
    await useDualEconomyStore.getState().spendSpoons(4, 'zone_entry', 'Work');
    await useDualEconomyStore.getState().regenerateSpoons(99, 'rest', 'Nap');
    expect(useDualEconomyStore.getState().budget.remaining).toBe(GROSS_SPOONS);
  });

  it('hash-chains transactions', async () => {
    await useDualEconomyStore.getState().spendSpoons(1, 'zone_entry', 'One');
    const txs = useDualEconomyStore.getState().spoonTransactions;
    expect(txs.length).toBe(1);
    expect(txs[0].hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('dual economy — karma', () => {
  beforeEach(() => {
    useDualEconomyStore.setState({
      budget: computeBudget(fresh(), { spent: 0, borrowed: 0 }),
      lifetimeKarma: 0,
      spoonTransactions: [],
      karmaAwards: [],
      _lastHash: 'genesis',
      _hasHydrated: true,
      did: 'did:key:test',
    });
  });

  it('increments lifetime karma monotonically', async () => {
    const s = useDualEconomyStore.getState();
    await s.awardKarma('did:key:parent', 'did:key:kid', 5, 'PING_REACTION');
    expect(useDualEconomyStore.getState().lifetimeKarma).toBe(5);
    await useDualEconomyStore.getState().awardKarma('did:key:parent', 'did:key:kid', 10, 'PEER_AWARD');
    expect(useDualEconomyStore.getState().lifetimeKarma).toBe(15);
  });

  it('rejects self-awards', async () => {
    const before = useDualEconomyStore.getState().karmaAwards.length;
    await useDualEconomyStore.getState().awardKarma('did:key:kid', 'did:key:kid', 100, 'PEER_AWARD');
    expect(useDualEconomyStore.getState().karmaAwards.length).toBe(before);
    expect(useDualEconomyStore.getState().lifetimeKarma).toBe(0);
  });
});

function ledgerEntry(
  entry_type: string,
  payload: unknown,
  created_at: number,
  did = 'did:key:test',
): LedgerEntry {
  return {
    id: `tx-${created_at}-${entry_type}`,
    actor_did: did,
    entry_type,
    payload: JSON.stringify(payload),
    created_at,
  };
}

function spoonTx(type: string, amount: number, balanceAfter: number, ts: number, hash = '') {
  return {
    id: `tx-${ts}`,
    timestamp: ts,
    type,
    amount,
    source: 'replay_test',
    description: `${type} ${amount}`,
    balanceAfter,
    hash,
  };
}

function resetStore() {
  useDualEconomyStore.setState({
    budget: computeBudget(
      { medicationTaken: true, painLevel: 0, courtDay: false, fragile: false },
      { spent: 0, borrowed: 0 },
    ),
    lifetimeKarma: 0,
    spoonTransactions: [],
    karmaAwards: [],
    _lastHash: 'genesis',
    _hasHydrated: false,
    did: '',
  });
}

describe('dual economy — ledger replay (hydrateFromLedger)', () => {
  beforeEach(resetStore);

  it('rebuilds budget from SPEND / BORROW / REGENERATE rows', () => {
    const rows = [
      ledgerEntry('SPOON_SPEND', spoonTx('SPEND', 4, 8, 1000), 1000),
      ledgerEntry('SPOON_BORROW', spoonTx('BORROW', 3, 11, 2000), 2000),
      ledgerEntry('SPOON_REGENERATE', spoonTx('REGENERATE', 1, 12, 3000), 3000),
    ];
    useDualEconomyStore.getState().hydrateFromLedger(rows);
    const s = useDualEconomyStore.getState();
    expect(s.budget.spent).toBe(4);
    expect(s.budget.borrowed).toBe(3);
    expect(s.budget.remaining).toBe(12);
    expect(s.budget.netBudget).toBe(16);
    expect(s.budget.tomorrowPenalty).toBe(Math.round(3 * BORROW_INTEREST));
    expect(s.spoonTransactions.length).toBe(3);
    expect(s._hasHydrated).toBe(true);
  });

  it('rebuilds karma awards and lifetime karma from KARMA_AWARD rows', () => {
    const rows = [
      ledgerEntry('KARMA_AWARD', { id: 'a1', timestamp: 100, fromUserId: 'did:key:a', toUserId: 'did:key:b', amount: 5, source: 'PING_REACTION', hash: 'h1' }, 100),
      ledgerEntry('KARMA_AWARD', { id: 'a2', timestamp: 200, fromUserId: 'did:key:a', toUserId: 'did:key:b', amount: 10, source: 'PEER_AWARD', hash: 'h2' }, 200),
    ];
    useDualEconomyStore.getState().hydrateFromLedger(rows);
    const s = useDualEconomyStore.getState();
    expect(s.lifetimeKarma).toBe(15);
    expect(s.karmaAwards.length).toBe(2);
    expect(s._lastHash).toBe('h2');
  });

  it('applies rows in chronological order regardless of input order', () => {
    const rows = [
      ledgerEntry('SPOON_SPEND', spoonTx('SPEND', 3, 7, 2000), 2000),
      ledgerEntry('SPOON_SPEND', spoonTx('SPEND', 2, 10, 1000), 1000),
    ];
    useDualEconomyStore.getState().hydrateFromLedger(rows);
    const s = useDualEconomyStore.getState();
    expect(s.budget.spent).toBe(5);
    expect(s.budget.remaining).toBe(7);
  });

  it('ignores malformed payloads and non-spoon rows', () => {
    const rows = [
      ledgerEntry('SPOON_SPEND', 'not-json', 100),
      ledgerEntry('RULES_SYNC', { irrelevant: true }, 200),
      ledgerEntry('SPOON_REGENERATE', spoonTx('REGENERATE', 2, 12, 300), 300),
    ];
    useDualEconomyStore.getState().hydrateFromLedger(rows);
    const s = useDualEconomyStore.getState();
    expect(s.spoonTransactions.length).toBe(1);
    expect(s.budget.remaining).toBe(12);
  });

  it('falls back to default budget when ledger is empty', () => {
    useDualEconomyStore.getState().hydrateFromLedger([]);
    const s = useDualEconomyStore.getState();
    expect(s.budget.netBudget).toBe(GROSS_SPOONS);
    expect(s.budget.remaining).toBe(GROSS_SPOONS);
    expect(s.budget.tier).toBe('FULL');
    expect(s._hasHydrated).toBe(true);
  });

  it('sets did from the first row and carries last hash forward', () => {
    const rows = [
      ledgerEntry('SPOON_SPEND', spoonTx('SPEND', 1, 11, 100, 'aa11'), 100, 'did:key:owner'),
    ];
    useDualEconomyStore.getState().hydrateFromLedger(rows);
    const s = useDualEconomyStore.getState();
    expect(s.did).toBe('did:key:owner');
    expect(s._lastHash).toBe('aa11');
  });
});
