/**
 * shell/chat/useThreadListVirtualizer.ts — the thread-list virtualizer.
 *
 * Start-anchored (newest thread at the top, scroll DOWN to load older) — the
 * inverse of the transcript's end-anchored config. Reuses the same
 * absolute-positioning contract: one `position: relative` spacer at
 * getTotalSize(), each row `position: absolute` + `translateY(virtualItem.start)`.
 *
 * NEVER use paddingTop/paddingBottom for row positioning — padding shifts the
 * offsets a row was measured against, feeding the virtualizer a
 * measurement-correction loop (the sidebar flicker bug).
 */
import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { BucketedThread } from './threadListStore';

export function useThreadListVirtualizer(items: BucketedThread[]) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 48,
    getItemKey: (index) => items[index]!.thread.id,
  });

  return {
    scrollRef,
    virtualizer,
    getVirtualItems: () => virtualizer.getVirtualItems(),
    getTotalSize: () => virtualizer.getTotalSize(),
    measureElement: virtualizer.measureElement,
  };
}