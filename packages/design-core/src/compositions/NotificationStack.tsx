
export type NotificationKind = 'info' | 'success' | 'milestone' | 'error';

export interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
}

export interface NotificationStackProps {
  /** Stacked notifications (spec). */
  items: Notification[];
  /** Dismiss one notification by id. */
  onDismiss?: (id: string) => void;
  /** Clear all. Optional. */
  onClearAll?: () => void;
  className?: string;
  ariaLabel?: string;
}

/** Per-kind auto-dismiss duration (ms). Kept as a module constant so callers
 *  can replicate the timing; the component itself does not own timers. */
export const NOTIFICATION_DURATION: Record<NotificationKind, number> = {
  info: 4500,
  success: 4000,
  milestone: 5000,
  error: 8000,
};

/** NotificationStack — stacked, severity-tinted toasts (bottom-right).
 *  Store-agnostic: `items` + `onDismiss` are props; the consumer owns the store
 *  and any auto-dismiss timers. Colors come from `data-kind` CSS, not inline style. */
export function NotificationStack({
  items,
  onDismiss,
  onClearAll,
  className = '',
  ariaLabel = 'Notifications',
}: NotificationStackProps) {
  if (items.length === 0) return null;

  return (
    <div className={`notif-stack ${className}`.trim()} role="region" aria-label={ariaLabel}>
      {items.map((n) => (
        <div key={n.id} className="notif-toast" role="status" data-kind={n.kind}>
          <div className="notif-toast__title">{n.title}</div>
          {n.body && <div className="notif-toast__body">{n.body}</div>}
          <button
            type="button"
            className="notif-toast__close"
            aria-label="Dismiss"
            onClick={() => onDismiss?.(n.id)}
          >
            ×
          </button>
        </div>
      ))}
      {onClearAll && (
        <button type="button" className="notif-stack__clear" onClick={onClearAll}>
          Clear all
        </button>
      )}
    </div>
  );
}

export default NotificationStack;