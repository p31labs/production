import { useEffect } from 'react'
import { NotificationStack as CanonNotificationStack } from '@p31ca/design-core/compositions'
import { useNotifStore, type NotifKind } from '@/store/useNotifStore'

/** Severity-based display times (Sonner/Cognite convention). */
const KIND_DURATION: Record<NotifKind, number> = {
  info: 4500,
  success: 4000,
  milestone: 5000,
  error: 8000,
}

/**
 * NotificationStack — consumer wrapper over the canon NotificationStack
 * composition. The canon owns the stack chrome and renders the identical
 * `notif-*` class contract; the portal supplies its store items, dismissal
 * handlers, and owns the per-kind auto-dismiss timers (the canon component
 * deliberately does not own timers).
 */
export function NotificationStack() {
  const items = useNotifStore((s) => s.items)
  const dismiss = useNotifStore((s) => s.dismiss)
  const clearAll = useNotifStore((s) => s.clearAll)

  // Auto-dismiss per kind.
  useEffect(() => {
    if (items.length === 0) return
    const timers = items.map((n) => {
      const duration = KIND_DURATION[n.kind]
      return window.setTimeout(() => dismiss(n.id), duration)
    })
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [items, dismiss])

  if (items.length === 0) return null

  return <CanonNotificationStack items={items} onDismiss={dismiss} onClearAll={clearAll} />
}

export default NotificationStack