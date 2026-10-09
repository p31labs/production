/**
 * shell/chat/useThreadVirtualizer.ts — the end-anchored virtualizer config.
 *
 * Chat flips the list contract: new output at the end, older history prepended
 * at the start, and the viewport follows new output only when the user is
 * already reading the latest message. anchorTo: 'end' keeps the visible item
 * stable across prepends; followOnAppend pins only when near the end;
 * scrollEndThreshold (px) is the "near the end" band.
 *
 * getItemKey returns the ledger id — never the index — because after a prepend
 * every message shifts index and index keys cannot identify a message across
 * the update. This is the prepend-stability invariant, structurally enforced.
 */
import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ChatMessage } from './threadStore';

export function useThreadVirtualizer(messages: ChatMessage[]) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 72,
    getItemKey: (index) => messages[index]!.id,
    anchorTo: 'end',
    followOnAppend: true,
    scrollEndThreshold: 80,
  });

  return {
    scrollRef,
    virtualizer,
    getVirtualItems: () => virtualizer.getVirtualItems(),
    getTotalSize: () => virtualizer.getTotalSize(),
    measureElement: virtualizer.measureElement,
    isAtEnd: (threshold?: number) => virtualizer.isAtEnd(threshold),
    getDistanceFromEnd: () => virtualizer.getDistanceFromEnd(),
    scrollToEnd: (behavior?: 'auto' | 'smooth') => virtualizer.scrollToEnd({ behavior }),
  };
}