/**
 * shell/chat/ThreadList.tsx — the thread-list sidebar.
 *
 * Virtualized (start-anchored) list of conversations with date buckets. The
 * absolute-positioning contract comes from useThreadListVirtualizer; a bucket
 * header renders inline above the first row of each bucket. The active row is
 * visually pinned (never re-sorted by a passive effect).
 */
import { useThreadListStore } from './threadListStore';
import { useThreadListVirtualizer } from './useThreadListVirtualizer';
import { useThreadListOnScroll } from './useThreadListOnScroll';

export interface ThreadListProps {
  onSelect?: (id: string) => void;
  onNew?: () => void;
}

export function ThreadList({ onSelect, onNew }: ThreadListProps) {
  const buckets = useThreadListStore((s) => s.buckets);
  const hasMore = useThreadListStore((s) => s.hasMore);
  const inFlight = useThreadListStore((s) => s.inFlight);
  const cursor = useThreadListStore((s) => s.cursor);
  const activeId = useThreadListStore((s) => s.activeId);
  const appendPage = useThreadListStore((s) => s.appendPage);
  const setInFlight = useThreadListStore((s) => s.setInFlight);

  const sentinelRef = useThreadListOnScroll({ hasMore, inFlight, cursor, onPage: appendPage, setInFlight });

  const { scrollRef, getVirtualItems, getTotalSize, measureElement } = useThreadListVirtualizer(buckets);
  const items = getVirtualItems();

  const showHeader = (index: number) => index === 0 || buckets[index]!.bucket !== buckets[index - 1]!.bucket;

  return (
    <div className="threadlist">
      <div className="threadlist__bar">
        <span className="threadlist__head">Threads</span>
        {onNew && (
          <button type="button" className="threadlist__new" onClick={onNew}>
            + New
          </button>
        )}
      </div>
      <div className="threadlist__scroll" ref={scrollRef} role="list" aria-label="Conversations">
        <div className="threadlist__sizer" style={{ height: getTotalSize(), position: 'relative' }}>
          {items.map((item) => {
            const b = buckets[item.index]!;
            return (
              <div
                key={item.key}
                data-thread-id={b.thread.id}
                ref={measureElement}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${item.start}px)` }}
              >
                {showHeader(item.index) && <div className="threadlist__bucket">{b.bucket}</div>}
                <button
                  type="button"
                  className={`threadlist__row${activeId === b.thread.id ? ' threadlist__row--active' : ''}`}
                  onClick={() => onSelect?.(b.thread.id)}
                >
                  <span className="threadlist__row-title">{b.thread.id}</span>
                  <span className="threadlist__row-meta">{b.thread.messageCount}</span>
                </button>
              </div>
            );
          })}
        </div>
        <div ref={sentinelRef} className="threadlist__sentinel" aria-hidden="true" />
      </div>
    </div>
  );
}