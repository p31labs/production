import { useEffect } from 'react';
import { NotificationStack as CanonNotificationStack, NOTIFICATION_DURATION, type Notification } from '@p31ca/design-core/compositions';
import { useNotifStore } from '../lib/useNotifStore';

/**
 * NotificationStack — canon store-agnostic toasts, wired to the portal store.
 * The canon does not own auto-dismiss timers (delegated to the consumer), so
 * the wrapper keeps the severity-timed dismiss loop here. Severity colors come
 * from the canon's `data-kind` CSS.
 */
export function NotificationStack() {
  const items = useNotifStore((s) => s.items);
  const dismiss = useNotifStore((s) => s.dismiss);
  const clearAll = useNotifStore((s) => s.clearAll);

  useEffect(() => {
    if (items.length === 0) return;
    const timers = items.map((n) => {
      const duration = NOTIFICATION_DURATION[n.kind];
      return window.setTimeout(() => dismiss(n.id), duration);
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [items, dismiss]);

  return (
    <CanonNotificationStack
      items={items as Notification[]}
      onDismiss={dismiss}
      onClearAll={clearAll}
    />
  );
}

export default NotificationStack;