import { useEffect } from 'react';
import { useNotifStore, type NotifKind } from '../lib/useNotifStore';

const KIND_DURATION: Record<NotifKind, number> = {
  info: 4500,
  success: 4000,
  milestone: 5000,
  error: 8000,
};

const KIND_COLOR: Record<NotifKind, string> = {
  info: 'var(--p31-accent)',
  success: 'var(--p31-accent-green)',
  milestone: 'var(--p31-accent-gold)',
  error: 'var(--p31-accent-red)',
};

/** NotificationStack — stacked, severity-timed toasts (bottom-right). */
export function NotificationStack() {
  const items = useNotifStore((s) => s.items);
  const dismiss = useNotifStore((s) => s.dismiss);
  const clearAll = useNotifStore((s) => s.clearAll);

  useEffect(() => {
    if (items.length === 0) return;
    const timers = items.map((n) => {
      const duration = KIND_DURATION[n.kind];
      return window.setTimeout(() => dismiss(n.id), duration);
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [items, dismiss]);

  if (items.length === 0) return null;

  return (
    <div className="notif-stack" role="region" aria-label="Notifications">
      {items.map((n) => (
        <div
          key={n.id}
          className="notif-toast"
          role="status"
          data-kind={n.kind}
          style={{ borderColor: KIND_COLOR[n.kind] }}
        >
          <div className="notif-toast__title" style={{ color: KIND_COLOR[n.kind] }}>
            {n.title}
          </div>
          {n.body && <div className="notif-toast-text">{n.body}</div>}
          <button type="button" className="notif-toast__close" aria-label="Dismiss" onClick={() => dismiss(n.id)}>
            ×
          </button>
        </div>
      ))}
      <button type="button" className="notif-stack__clear" onClick={clearAll}>
        Clear all
      </button>
    </div>
  );
}

export default NotificationStack;