import { useShellStore, type NotificationSource } from '../store/useShellStore';
import { useAppStore } from '../store/useAppStore';
import { useSensoryStore } from '../store/useSensoryStore';

const SOURCE_LABEL: Record<NotificationSource, string> = {
  mesh: 'mesh',
  system: 'system',
  assistant: 'assistant',
  spoon: 'spoon',
  love: 'LOVE',
  app: 'app',
};

export default function NotificationHub() {
  const open = useShellStore((s) => s.hubOpen);
  const setOpen = useShellStore((s) => s.setHubOpen);
  const notifications = useShellStore((s) => s.notifications);
  const markRead = useShellStore((s) => s.markRead);
  const markAllRead = useShellStore((s) => s.markAllRead);
  const clearAll = useShellStore((s) => s.clearAll);
  const optIns = useShellStore((s) => s.optIns);
  const toggleOptIn = useShellStore((s) => s.toggleOptIn);
  const spoons = useAppStore((s) => s.spoons);
  const focus = useSensoryStore((s) => s.focus);

  if (!open) return null;

  const muted = spoons === 0;
  // Focus mode shows only high-priority (or already-read) notifications.
  const visible = focus
    ? notifications.filter((n) => n.priority === 'high' || n.read)
    : notifications;

  return (
    <div className={`notification-hub-dropdown${open ? ' open' : ''}`}>
      <div className="notification-hub-head">
        <span className="notification-hub-title">🔔 Alerts</span>
        <div className="notification-hub-actions">
          <button type="button" className="hub-action" onClick={markAllRead}>Mark read</button>
          <button type="button" className="hub-action" onClick={clearAll} aria-description="Permanently clears all notifications from this device">Clear</button>
          <button type="button" className="hub-action close" onClick={() => setOpen(false)} aria-label="Close notifications">✕</button>
        </div>
      </div>

      <div className="notification-hub-optins" role="group" aria-label="Notification sources">
        {(Object.keys(optIns) as NotificationSource[]).map((src) => (
          <label key={src} className="optin-pill">
            <input type="checkbox" checked={optIns[src]} onChange={() => toggleOptIn(src)} />
            <span>{SOURCE_LABEL[src]}</span>
          </label>
        ))}
      </div>

      {muted ? (
        <div className="notification-empty">
          <span className="notification-empty-icon">🧘</span>
          <p>Notifications muted while you rest. Raise your spoons to re-enable.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="notification-empty">
          <span className="notification-empty-icon">🫧</span>
          <p>All clear.</p>
        </div>
      ) : (
        <ul className="notification-list">
          {visible.map((n) => (
            <li key={n.id} className={`notification-item${n.read ? '' : ' unread'}`} onClick={() => markRead(n.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); markRead(n.id); } }}>
              <span className="notification-item-icon">{n.icon}</span>
              <div className="notification-item-body">
                <div className="notification-item-title">{n.title}</div>
                <div className="notification-item-desc">{n.body}</div>
                <div className="notification-item-meta">
                  <span className="notification-item-source">{SOURCE_LABEL[n.source]}</span>
                  <span className="notification-item-time">
                    {new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
