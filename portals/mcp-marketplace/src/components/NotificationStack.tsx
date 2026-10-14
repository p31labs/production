import { useEffect } from 'react'
import { NotificationStack as CanonNotificationStack, NOTIFICATION_DURATION } from '@p31ca/design-core/compositions'
import { useNotifStore } from '@/store/useNotifStore'

/**
 * NotificationStack — canon wrapper (consume-don't-fork).
 *
 * The canon owns the stacked rendering (severity tint via `data-kind`, close
 * + clear-all controls) and intentionally keeps no timers; this wrapper owns
 * the portal's per-kind auto-dismiss schedule using the canon's exported
 * NOTIFICATION_DURATION table.
 */
export function NotificationStack() {
  const items = useNotifStore((s) => s.items)
  const dismiss = useNotifStore((s) => s.dismiss)
  const clearAll = useNotifStore((s) => s.clearAll)

  // Auto-dismiss per kind (canon leaves timers to the consumer).
  useEffect(() => {
    if (items.length === 0) return
    const timers = items.map((n) => window.setTimeout(() => dismiss(n.id), NOTIFICATION_DURATION[n.kind]))
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [items, dismiss])

  return <CanonNotificationStack items={items} onDismiss={dismiss} onClearAll={clearAll} />
}

export default NotificationStack