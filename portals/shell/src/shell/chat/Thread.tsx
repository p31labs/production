/**
 * shell/chat/Thread.tsx — the virtualized, end-anchored message list.
 *
 * Renders O(visible) DOM nodes for any number of messages. The scroll container
 * is normal-order (no column-reverse, no inverted transforms); prepend
 * stability and follow-on-append come from the virtualizer config in
 * useThreadVirtualizer. A "jump to latest" affordance appears when the user has
 * scrolled away from the end.
 */
import type { RefObject } from 'react';
import { useThreadVirtualizer } from './useThreadVirtualizer';
import { StreamingMarkdown } from './StreamingMarkdown';
import type { ChatMessage } from './threadStore';

export interface ThreadProps {
  messages: ChatMessage[];
  /** The top sentinel the load-older observer watches. */
  sentinelRef?: RefObject<HTMLDivElement | null>;
}

export function Thread({ messages, sentinelRef }: ThreadProps) {
  const {
    scrollRef,
    getVirtualItems,
    getTotalSize,
    measureElement,
    isAtEnd,
    scrollToEnd,
  } = useThreadVirtualizer(messages);

  const items = getVirtualItems();

  return (
    <div className="chat-thread__wrap">
      <div className="chat-thread__scroll" ref={scrollRef} role="log" aria-live="polite" aria-label="Conversation">
        {sentinelRef && <div ref={sentinelRef} className="chat-thread__sentinel" aria-hidden="true" />}
        <div className="chat-thread__sizer" style={{ height: getTotalSize(), position: 'relative' }}>
          {items.map((item) => {
            const msg = messages[item.index]!;
            return (
              <div
                key={item.key}
                data-index={item.index}
                data-message-id={msg.id}
                ref={measureElement}
                className={`chat-msg chat-msg--${msg.role}`}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${item.start}px)` }}
              >
                <span className="chat-msg__author">{msg.role}</span>
                {msg.role === 'assistant' ? (
                  <div className="chat-msg__text chat-msg__text--md">
                    <StreamingMarkdown text={msg.text} />
                  </div>
                ) : (
                  <p className="chat-msg__text">{msg.text}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!isAtEnd() && (
        <button
          type="button"
          className="chat-thread__jump"
          onClick={() => scrollToEnd('smooth')}
          data-agent-kind="action"
          data-agent-action="chat.thread.jumpToEnd"
        >
          ↓ latest
        </button>
      )}
    </div>
  );
}