import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { useQpjStore, DEFAULT_SPOONS } from '../store/useQpjStore';
import { LOVELedgerCard } from '../components/LOVELedgerCard';
import {
  initialLove,
  splitEarn,
  warmedCareScore,
  decayedCareScore,
  careGatedAmount,
  pruneLoveLog,
  LOVE_CARE_FLOOR,
  LOVE_CARE_IDLE_DAYS,
  LOVE_CARE_MAX,
  DAY_MS,
  type LoveEntry,
} from '../lib/love';

function seedLove(careScore: number, now = Date.now()) {
  return { ...initialLove(now), careScore };
}

beforeEach(() => {
  useQpjStore.setState({
    passportId: 'dillpickle',
    spoons: DEFAULT_SPOONS,
    love: seedLove(0.5),
  });
});

afterEach(() => {
  cleanup();
});

describe('LOVE ledger — pure helpers', () => {
  it('splits every earn 50/50 across the two pools', () => {
    expect(splitEarn(2)).toEqual({ sovereignty: 1, performance: 1 });
    expect(splitEarn(0.5)).toEqual({ sovereignty: 0.25, performance: 0.25 });
  });

  it('gates the earned amount by the care score', () => {
    expect(careGatedAmount(2, 0.5)).toBe(1);
    expect(careGatedAmount(1, LOVE_CARE_FLOOR)).toBe(LOVE_CARE_FLOOR);
  });

  it('warms the care score on each care act and caps at the maximum', () => {
    expect(warmedCareScore(0.5)).toBe(0.52);
    expect(warmedCareScore(0.98)).toBe(LOVE_CARE_MAX);
  });

  it('decays only after the idle grace period, down to the floor', () => {
    const now = DAY_MS * 100;
    expect(decayedCareScore(0.6, now - DAY_MS * LOVE_CARE_IDLE_DAYS, now)).toBe(0.6);
    expect(decayedCareScore(0.6, now - DAY_MS * (LOVE_CARE_IDLE_DAYS + 4), now)).toBeCloseTo(0.4, 5);
    expect(
      decayedCareScore(0.6, now - DAY_MS * (LOVE_CARE_IDLE_DAYS + 60), now),
    ).toBe(LOVE_CARE_FLOOR);
  });

  it('prunes the log to a bounded size', () => {
    const entries: LoveEntry[] = Array.from({ length: 45 }, (_, i) => ({
      id: `e${i}`,
      at: i,
      kind: 'earn',
      source: 'talk',
      amount: 1,
      by: 'Dillpickle',
    }));
    expect(pruneLoveLog(entries)).toHaveLength(40);
    expect(pruneLoveLog(entries)[0].id).toBe('e5');
  });
});

describe('LOVE ledger — store', () => {
  it('earnLove splits into both pools, warms the score, and logs', () => {
    useQpjStore.getState().earnLove('talk', 'Dillpickle');
    const love = useQpjStore.getState().love;
    expect(love.sovereignty).toBeCloseTo(0.25, 5);
    expect(love.performance).toBeCloseTo(0.25, 5);
    expect(love.careScore).toBeCloseTo(0.52, 5);
    expect(love.log).toHaveLength(1);
    expect(love.log[0]).toMatchObject({ kind: 'earn', source: 'talk', by: 'Dillpickle' });
  });

  it('heavier care acts earn more', () => {
    useQpjStore.getState().earnLove('identity', 'Bread & Butter');
    const love = useQpjStore.getState().love;
    expect(love.sovereignty).toBeCloseTo(0.75, 5);
    expect(love.performance).toBeCloseTo(0.75, 5);
  });

  it('spendLove spends only the performance pool', () => {
    useQpjStore.getState().earnLove('talk', 'Dillpickle');
    useQpjStore.getState().spendLove(0.25, 'the street');
    const love = useQpjStore.getState().love;
    expect(love.performance).toBeCloseTo(0, 5);
    expect(love.sovereignty).toBeCloseTo(0.25, 5);
    expect(love.log.at(-1)).toMatchObject({ kind: 'spend', amount: -0.25, to: 'the street' });
  });

  it('cannot overspend the performance pool', () => {
    const before = useQpjStore.getState().love.performance;
    useQpjStore.getState().spendLove(50);
    const love = useQpjStore.getState().love;
    expect(love.performance).toBeCloseTo(0, 5);
    expect(love.performance).toBeLessThanOrEqual(before);
  });

  it('spending nothing when the pool is empty changes nothing', () => {
    useQpjStore.setState({ love: seedLove(0.5) });
    useQpjStore.getState().spendLove(1);
    expect(useQpjStore.getState().love.performance).toBe(0);
    expect(useQpjStore.getState().love.log).toHaveLength(0);
  });

  it('survives a passport switch — LOVE is family ledger, spoons are session', () => {
    useQpjStore.getState().earnLove('talk', 'Dillpickle');
    const loveBefore = useQpjStore.getState().love;
    useQpjStore.getState().setPassport('gherkin');
    const loveAfter = useQpjStore.getState().love;
    expect(loveAfter.performance).toBe(loveBefore.performance);
    expect(loveAfter.sovereignty).toBe(loveBefore.sovereignty);
    expect(useQpjStore.getState().spoons).toBe(DEFAULT_SPOONS);
    expect(useQpjStore.getState().talkMessages).toHaveLength(0);
  });
});

describe('LOVELedgerCard', () => {
  it('renders both pools and shows an empty ledger state', () => {
    render(<LOVELedgerCard />);
    expect(screen.getByText('LOVE')).toBeTruthy();
    expect(screen.getByText('Sovereignty')).toBeTruthy();
    expect(screen.getByText('Performance')).toBeTruthy();
    expect(screen.getByText('The ledger starts when care begins.')).toBeTruthy();
  });

  it('disables the care-note action when the performance pool is empty', () => {
    render(<LOVELedgerCard />);
    expect(screen.getByRole('button', { name: 'Gift a care note' })).toHaveProperty('disabled', true);
  });

  it('gifts a care note when there is performance to spend', () => {
    useQpjStore.setState({ love: { ...seedLove(0.5), sovereignty: 1, performance: 2 } });
    render(<LOVELedgerCard />);
    const btn = screen.getByRole('button', { name: 'Gift a care note' });
    expect(btn).toHaveProperty('disabled', false);
    fireEvent.click(btn);
    expect(screen.getByText('Care note recorded on the ledger.')).toBeTruthy();
    expect(useQpjStore.getState().love.performance).toBeCloseTo(1, 5);
    expect(useQpjStore.getState().love.log.at(-1)).toMatchObject({
      kind: 'spend',
      to: 'the street',
    });
  });
});