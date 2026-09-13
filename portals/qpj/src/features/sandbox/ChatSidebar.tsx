import { useMemo, useRef, useState, useEffect } from 'react';
import { useSandboxStore } from './sandboxStore';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { relativeTime, groupThreads } from './threadList';
import type { Thread } from './sandboxStore';

const SIDEBAR_WIDTH_KEY = 'qpj-chat-sidebar-width';
const MIN_SIDEBAR = 240;
const MAX_SIDEBAR = 400;
const REFRESH_MS = 60 * 1000;
const SEARCH_DEBOUNCE_MS = 150;

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export default function ChatSidebar() {
  const threads = useSandboxStore((s) => s.threads);
  const activeThreadId = useSandboxStore((s) => s.activeThreadId);
  const globalStreaming = useSandboxStore((s) => s.isStreaming);
  const createThread = useSandboxStore((s) => s.createThread);
  const setActiveThread = useSandboxStore((s) => s.setActiveThread);
  const deleteThread = useSandboxStore((s) => s.deleteThread);

  const [rawQuery, setRawQuery] = useState('');
  const [query, setQuery] = useState('');
  const [sidebarWidth, setSidebarWidth] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = Number(window.localStorage.getItem(SIDEBAR_WIDTH_KEY));
    return Number.isFinite(stored) && stored >= MIN_SIDEBAR && stored <= MAX_SIDEBAR ? stored : null;
  });
  const isDesktop = useMediaQuery('(min-width: 900px)');
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setQuery(rawQuery), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [rawQuery]);

  const visibleThreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => t.title.toLowerCase().includes(q) || t.lastMessage.toLowerCase().includes(q));
  }, [threads, query]);

  const groups = useMemo(() => groupThreads(visibleThreads), [visibleThreads]);
  const visibleIds = useMemo(() => groups.flatMap((g) => g.threads.map((t) => t.id)), [groups]);

  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const resizeStart = useRef<{ x: number; width: number } | null>(null);

  const focusIndex = (idx: number) => {
    const id = visibleIds[idx];
    if (id) itemRefs.current.get(id)?.focus();
  };

  const handleItemKeyDown = (e: React.KeyboardEvent, t: Thread) => {
    const idx = visibleIds.indexOf(t.id);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusIndex(idx + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusIndex(idx - 1);
    } else if (e.key === 'Delete') {
      e.preventDefault();
      if (idx + 1 < visibleIds.length) focusIndex(idx + 1);
      else if (idx - 1 >= 0) focusIndex(idx - 1);
      deleteThread(t.id);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActiveThread(t.id);
    }
  };

  const startResize = (e: React.PointerEvent<HTMLDivElement>) => {
    resizeStart.current = { x: e.clientX, width: sidebarWidth ?? 256 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = resizeStart.current;
    if (!start) return;
    const width = Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, start.width + (e.clientX - start.x)));
    setSidebarWidth(width);
  };

  const endResize = () => {
    resizeStart.current = null;
    if (sidebarWidth != null) window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
  };

  const handleNew = () => {
    setRawQuery('');
    setQuery('');
    createThread();
  };

  return (
    <div
      className="chat-sidebar"
      style={sidebarWidth != null && isDesktop ? { '--p31-chat-sidebar-width': `${sidebarWidth}px` } as React.CSSProperties : undefined}
      aria-label="Threads sidebar"
    >
      <div className="chat-sidebar-header">
        <h3>Threads</h3>
      </div>

      <button type="button" className="chat-sidebar-new" onClick={handleNew}>
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        New thread
      </button>

      <div className="chat-sidebar-search-wrap">
        <svg className="chat-sidebar-search-icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          className="chat-sidebar-search"
          placeholder={'Search threads\u2026'}
          aria-label="Search threads"
          value={rawQuery}
          onChange={(e) => setRawQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setRawQuery(''); setQuery(''); } }}
        />
      </div>

      <div className="chat-thread-list">
        {threads.length === 0 ? (
          <p className="chat-sidebar-empty">{'No threads yet \u2014 start a conversation'}</p>
        ) : visibleThreads.length === 0 ? (
          <p className="chat-sidebar-empty">No matches</p>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="chat-thread-group">
              <span className="chat-thread-group-label">{group.label}</span>
              {group.threads.map((t) => {
                const active = t.id === activeThreadId;
                const streaming = globalStreaming && active;
                const unread = !active && t.updatedAt > t.lastViewedAt && t.updatedAt > 0;
                return (
                  <div
                    key={t.id}
                    ref={(el) => { if (el) itemRefs.current.set(t.id, el); else itemRefs.current.delete(t.id); }}
                    className={`chat-thread-item${active ? ' chat-thread-item--active' : ''}${streaming ? ' chat-thread-item--streaming' : ''}${unread ? ' chat-thread-item--unread' : ''}`}
                    onClick={() => setActiveThread(t.id)}
                    role="button"
                    tabIndex={0}
                    aria-current={active ? 'true' : undefined}
                    onKeyDown={(e) => handleItemKeyDown(e, t)}
                  >
                    <span className="chat-thread-item-status" aria-hidden="true" />
                    <div className="chat-thread-item-body">
                      <span className="chat-thread-item-title">{t.title}</span>
                      <span className="chat-thread-item-preview">{t.lastMessage || 'No messages yet'}</span>
                    </div>
                    <time className="chat-thread-item-time" title={new Date(t.updatedAt).toLocaleString()}>
                      {relativeTime(t.updatedAt)}
                    </time>
                    <button
                      type="button"
                      className="chat-thread-item-delete"
                      onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }}
                      aria-label={`Delete ${t.title}`}
                      title="Delete thread"
                      tabIndex={-1}
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {isDesktop && (
        <div
          className="chat-sidebar-resize"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          onPointerDown={startResize}
          onPointerMove={onResizeMove}
          onPointerUp={endResize}
          onPointerCancel={endResize}
        />
      )}
    </div>
  );
}
