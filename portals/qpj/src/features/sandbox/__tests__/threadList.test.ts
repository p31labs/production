import { describe, it, expect } from 'vitest';
import { deriveThreadTitle, relativeTime, groupThreads } from '../threadList';
import type { Thread } from '../types';

const thread = (id: string, updatedAt: number): Thread => ({ id, title: id, lastMessage: '', createdAt: 0, updatedAt, lastViewedAt: 0 });

describe('deriveThreadTitle', () => {
  it.each([
    ['build a calming dashboard', 'A calming dashboard'],
    ['create a login form with validation', 'A login form with validation'],
    ['make a card grid with glass borders', 'A card grid with glass borders'],
    ['generate a settings page layout', 'A settings page layout'],
  ])('strips filler words from "%s"', (input, expected) => {
    expect(deriveThreadTitle(input)).toBe(expected);
  });

  it('capitalizes the first word', () => {
    expect(deriveThreadTitle('ticker tape')).toBe('Ticker tape');
  });

  it('truncates a long topic at 32 chars with an ellipsis', () => {
    const title = deriveThreadTitle('build a calming dashboard with a spoon meter');
    expect(title).toBe('A calming dashboard with a spoon\u2026');
    expect(title.length).toBeLessThanOrEqual(33);
  });

  it('keeps the raw message when it is only a filler word', () => {
    expect(deriveThreadTitle('build ').trim()).toBe('build');
  });
});

describe('relativeTime', () => {
  const now = Date.now();

  it('renders just now for < 1 minute', () => {
    expect(relativeTime(now - 30 * 1000)).toBe('now');
  });

  it('renders minutes for < 1 hour', () => {
    expect(relativeTime(now - 2 * 60 * 1000)).toBe('2m');
  });

  it('renders hours for < 1 day', () => {
    expect(relativeTime(now - 5 * 60 * 60 * 1000)).toBe('5h');
  });

  it('renders days for < 1 week', () => {
    expect(relativeTime(now - 3 * 24 * 60 * 60 * 1000)).toBe('3d');
  });

  it('renders weeks for < 4 weeks', () => {
    expect(relativeTime(now - 2 * 7 * 24 * 60 * 60 * 1000)).toBe('2w');
  });

  it('renders an absolute date beyond 4 weeks', () => {
    const monthAgo = now - 40 * 24 * 60 * 60 * 1000;
    expect(relativeTime(monthAgo)).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
  });
});

describe('groupThreads', () => {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  it('groups by Today / Yesterday / Last 7 days / Older', () => {
    const today = thread('t0', now - 1000);
    const yesterday = thread('t1', now - DAY - 1000);
    const week = thread('t2', now - 4 * DAY);
    const old = thread('t3', now - 30 * DAY);

    const groups = groupThreads([today, yesterday, week, old]);
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Yesterday', 'Last 7 days', 'Older']);
    expect(groups[0].threads.map((t) => t.id)).toEqual(['t0']);
    expect(groups[1].threads.map((t) => t.id)).toEqual(['t1']);
    expect(groups[2].threads.map((t) => t.id)).toEqual(['t2']);
    expect(groups[3].threads.map((t) => t.id)).toEqual(['t3']);
  });

  it('omits empty groups', () => {
    const groups = groupThreads([thread('old', now - 30 * DAY)]);
    expect(groups.map((g) => g.label)).toEqual(['Older']);
  });

  it('returns an empty array when there are no threads', () => {
    expect(groupThreads([])).toEqual([]);
  });
});