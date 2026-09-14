import { Button } from '@p31/design-core/compositions';
import { useEffect, useRef } from 'react';
import { useNotifStore, type Notification } from '../store/useNotifStore';
import './notification.css';

const VISIBLE = 4;
const NOTIF_MS = 4200;

function NotifCard({
  n,
  onDismiss,
}: {
  n: Notification;
  onDismiss: (id: string) => void;
}) {
  return (
    <div className={`notif notif--${n.kind}`} role="status">
      <span className="notif__bar" aria-hidden="true" />
      <div className="notif__body">
        <p className="notif__title">{n.title}</p>
        {n.body ? <p className="notif__text">{n.body}</p> : null}
      </div>
      <Button type="button" className="notif__close" onClick={() => onDismiss(n.id)} aria-label="Dismiss notification">
        ×
      </Button>
    </div>
  );
}

export function NotificationStack() {
  const notifications = useNotifStore((s) => s.items);
  const dismiss = useNotifStore((s) => s.dismiss);
  const seen = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const fresh = notifications.filter((n) => !seen.current[n.id]);
    if (fresh.length === 0) return undefined;
    fresh.forEach((n) => {
      seen.current[n.id] = true;
    });
    const timers = fresh.map((n) => window.setTimeout(() => dismiss(n.id), NOTIF_MS));
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [notifications, dismiss]);

  const visible = notifications.slice(-VISIBLE);
  if (visible.length === 0) return null;
  return (
    <div className="notif-stack" aria-live="polite">
      {visible.map((n) => (
        <NotifCard key={n.id} n={n} onDismiss={dismiss} />
      ))}
    </div>
  );
}