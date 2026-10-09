/**
 * ActivityFeed.tsx — read-only timeline of the activity store.
 *
 * Renders allowlisted bus_events, collapsed by the store's dedup, newest
 * first. Reads only; it never publishes or appends to the ledger.
 */

import { useCallback, useEffect, useState } from 'react';
import { Button, GlassPanel } from '@p31ca/design-core/compositions';
import { ACTIVITY_LABELS } from '../lib/activityLabels';
import { type ActivityItem, useActivityStore } from '../lib/activityStore';

function formatTime(createdAt: number): string {
  return new Date(createdAt).toLocaleTimeString();
}

export function ActivityFeed() {
  const events = useActivityStore((s) => s.events);
  const cursor = useActivityStore((s) => s.cursor);
  const setEvents = useActivityStore((s) => s.setEvents);
  const prepend = useActivityStore((s) => s.prepend);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (before?: string) => {
      const qs = new URLSearchParams({ limit: '50' });
      if (before) qs.set('before', before);
      const res = await fetch(`/api/activity?${qs.toString()}`);
      const data = (await res.json()) as { events: ActivityItem[]; hasMore: boolean };
      if (before) {
        prepend(data.events);
      } else {
        setEvents(data.events);
      }
      setHasMore(data.hasMore);
    },
    [prepend, setEvents],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const loadOlder = async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      await load(cursor);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassPanel className="activity-feed" data-mcp-tool="activityFeed" data-mcp-state="ready">
      <div className="activity-feed__head">
        <h1 className="activity-feed__title">Activity</h1>
      </div>

      <ul className="activity-feed__timeline">
        {events.map((ev) => (
          <li key={ev.id} className="activity-feed__item">
            <span className="activity-feed__actor">{ev.actor || ev.face || 'unknown'}</span>
            <span className="activity-feed__action">{ACTIVITY_LABELS[ev.type] ?? ev.type}</span>
            {ev.count > 1 && <span className="activity-feed__count">×{ev.count}</span>}
            <time className="activity-feed__time">{formatTime(ev.createdAt)}</time>
          </li>
        ))}
      </ul>

      {hasMore && (
        <div className="activity-feed__more">
          <Button variant="ghost" onClick={loadOlder} disabled={loading}>
            {loading ? 'Loading…' : 'Load older'}
          </Button>
        </div>
      )}
    </GlassPanel>
  );
}

export default ActivityFeed;