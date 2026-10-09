import { useSandboxStore } from './sandboxStore';

export default function ChatSidebar() {
  const threads = useSandboxStore((s) => s.threads);
  const activeThreadId = useSandboxStore((s) => s.activeThreadId);
  const createThread = useSandboxStore((s) => s.createThread);
  const setActiveThread = useSandboxStore((s) => s.setActiveThread);
  const deleteThread = useSandboxStore((s) => s.deleteThread);

  return (
    <div className="chat-sidebar">
      <div className="chat-sidebar-header">
        <h3>Threads</h3>
        <button
          type="button"
          className="btn ghost"
          style={{ padding: '4px 8px', fontSize: 'var(--p31-scale-xs)', minHeight: 28 }}
          onClick={() => createThread()}
          aria-label="New thread"
        >
          + New
        </button>
      </div>
      <div className="chat-thread-list">
        {threads.map((t) => {
          const active = t.id === activeThreadId;
          return (
            <div
              key={t.id}
              className={`chat-thread-item${active ? ' chat-thread-item--active' : ''}`}
              onClick={() => setActiveThread(t.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') setActiveThread(t.id); }}
            >
              <span className="chat-thread-item-title">{t.title}</span>
              <button
                type="button"
                className="chat-thread-item-delete"
                onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }}
                aria-label={`Delete ${t.title}`}
                title="Delete thread"
              >
                ✕
              </button>
            </div>
          );
        })}
        {threads.length === 0 && (
          <p className="chat-sidebar-empty">
            No threads yet.
          </p>
        )}
      </div>
    </div>
  );
}
