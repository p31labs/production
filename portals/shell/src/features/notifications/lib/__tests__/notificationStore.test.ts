import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotificationStore, type Notification } from '../notificationStore';

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n-1',
    objectType: 'page',
    objectId: 'page-1',
    reason: 'mention',
    count: 1,
    actorDid: 'did:key:alice',
    createdAt: '2026-10-07T00:00:00Z',
    read: false,
    ...overrides,
  };
}

function flush() {
  vi.runAllTimers();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', undefined);
  useNotificationStore.setState({ active: [], history: [] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('notificationStore.add (dedup-by-target)', () => {
  it('collapses three adds for the same target into one active notification with count 3', () => {
    const { add } = useNotificationStore.getState();
    const target = { objectType: 'page' as const, objectId: 'page-1', reason: 'mention' as const };

    add(makeNotification({ ...target, id: 'n-1', count: 1 }));
    add(makeNotification({ ...target, id: 'n-2', count: 1 }));
    add(makeNotification({ ...target, id: 'n-3', count: 1 }));
    flush();

    const { active } = useNotificationStore.getState();
    expect(active).toHaveLength(1);
    expect(active[0].count).toBe(3);
  });

  it('does not collapse notifications for different targets', () => {
    const { add } = useNotificationStore.getState();

    add(makeNotification({ objectId: 'page-1', id: 'n-1' }));
    add(makeNotification({ objectId: 'page-2', id: 'n-2' }));
    flush();

    const { active } = useNotificationStore.getState();
    expect(active).toHaveLength(2);
    expect(active[0].count).toBe(1);
    expect(active[1].count).toBe(1);
  });

  it('does not collapse the same target with a different reason', () => {
    const { add } = useNotificationStore.getState();

    add(makeNotification({ objectId: 'page-1', reason: 'mention', id: 'n-1' }));
    add(makeNotification({ objectId: 'page-1', reason: 'reply', id: 'n-2' }));
    flush();

    const { active } = useNotificationStore.getState();
    expect(active).toHaveLength(2);
  });
});