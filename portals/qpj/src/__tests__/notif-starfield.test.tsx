import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { useNotifStore } from '../store/useNotifStore';
import { NotificationStack } from '../components/NotificationStack';
import { Starfield } from '../components/Starfield';
import { genStars, prng } from '../lib/starfield';

describe('useNotifStore', () => {
  beforeEach(() => {
    useNotifStore.setState({ items: [], seq: 0 });
  });

  it('notifies with a stable id and sentAt', () => {
    useNotifStore.getState().notify({ kind: 'milestone', title: 'Claimed Space' });
    const items = useNotifStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Claimed Space');
    expect(items[0].kind).toBe('milestone');
    expect(typeof items[0].id).toBe('string');
    expect(items[0].sentAt).toBeGreaterThan(0);
  });

  it('dismisses a single notification by id', () => {
    const first = useNotifStore.getState();
    first.notify({ kind: 'success', title: 'one' });
    first.notify({ kind: 'info', title: 'two' });
    const { dismiss, items } = useNotifStore.getState();
    dismiss(items[0].id);
    const remaining = useNotifStore.getState().items;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].title).toBe('two');
  });

  it('caps the retained list while the stack stays usable', () => {
    const { notify } = useNotifStore.getState();
    for (let i = 0; i < 10; i += 1) {
      notify({ kind: 'info', title: `n${i}` });
    }
    expect(useNotifStore.getState().items).toHaveLength(8);
  });

  it('clearAll empties the stack', () => {
    useNotifStore.getState().notify({ kind: 'info', title: 'x' });
    useNotifStore.getState().clearAll();
    expect(useNotifStore.getState().items).toHaveLength(0);
  });
});

describe('starfield lib', () => {
  it('generates stars deterministically for a fixed seed', () => {
    const a = genStars(50, 1234);
    const b = genStars(50, 1234);
    expect(a).toEqual(b);
  });

  it('generates valid star geometry', () => {
    const stars = genStars(100, 42);
    expect(stars).toHaveLength(100);
    for (const s of stars) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(1);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThanOrEqual(1);
      expect(s.r).toBeGreaterThan(0);
    }
  });

  it('prng is deterministic and scoped to [0, 1)', () => {
    const rand = prng(7);
    const seq = [rand(), rand(), rand()];
    const again = prng(7);
    expect([again(), again(), again()]).toEqual(seq);
    for (const v of seq) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('NotificationStack', () => {
  beforeEach(() => {
    useNotifStore.setState({ items: [], seq: 0 });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders nothing while the stack is empty', () => {
    const { container } = render(<NotificationStack />);
    expect(container.textContent).toBe('');
  });

  it('renders a notification and auto-dismisses it', () => {
    vi.useFakeTimers();
    const { notify } = useNotifStore.getState();
    notify({ kind: 'milestone', title: 'Claimed Space', body: 'An SBT rides the lane.' });
    render(<NotificationStack />);
    expect(screen.getByText('Claimed Space')).toBeTruthy();
    expect(screen.getByText('An SBT rides the lane.')).toBeTruthy();
    vi.advanceTimersByTime(4300);
    expect(useNotifStore.getState().items).toHaveLength(0);
  });

  it('manual dismiss removes the card immediately', () => {
    const { notify } = useNotifStore.getState();
    notify({ kind: 'success', title: 'Shed opened' });
    const { unmount } = render(<NotificationStack />);
    screen.getByLabelText('Dismiss notification').click();
    expect(useNotifStore.getState().items).toHaveLength(0);
    unmount();
  });
});

describe('Starfield', () => {
  it('renders a decorative canvas without throwing', () => {
    const { container } = render(<Starfield />);
    const canvas = container.querySelector('canvas.starfield');
    expect(canvas).toBeTruthy();
    expect(canvas?.getAttribute('aria-hidden')).toBe('true');
  });
});