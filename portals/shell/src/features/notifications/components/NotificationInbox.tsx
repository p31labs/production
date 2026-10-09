/**
 * @file NotificationInbox.tsx — bell + unread badge + active notification list.
 */

import { useNotificationStore } from '../lib/notificationStore';
import { useReadOnViewport } from '../hooks/useReadOnViewport';

export function NotificationInbox() {
  const active = useNotificationStore((s) => s.active);
  const markRead = useNotificationStore((s) => s.markRead);
  const refFor = useReadOnViewport(markRead);

  return (
    <div className="notification-inbox">
      <button type="button" className="notification-inbox__bell" aria-label="Notifications">
        <span aria-hidden="true">bell</span>
        {active.length > 0 && (
          <span className="notification-inbox__badge">{active.length}</span>
        )}
      </button>
      <ul className="notification-inbox__list">
        {active.map((n) => (
          <li key={n.id} ref={refFor(n.id)} className="notification-inbox__item">
            <span className="notification-inbox__reason">{n.reason}</span>
            <span className="notification-inbox__count">{n.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}