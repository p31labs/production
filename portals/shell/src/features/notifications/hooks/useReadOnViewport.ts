/**
 * @file useReadOnViewport.ts — mark a notification read when it scrolls into view.
 *
 * Returns a ref factory: `ref={refFor(id)}`. The observer tags each element
 * with its id via `data-read-id` so the intersection callback can map the
 * target back to the notification that entered the viewport.
 */

import { useEffect, useRef } from 'react';

export function useReadOnViewport(onRead: (id: string) => void) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const onReadRef = useRef(onRead);
  onReadRef.current = onRead;

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const id = (entry.target as HTMLElement).dataset.readId;
        if (id) onReadRef.current(id);
      }
    });
    observerRef.current = observer;
    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, []);

  return (id: string) => (el: HTMLElement | null) => {
    const observer = observerRef.current;
    if (!observer || !el) return;
    el.dataset.readId = id;
    observer.observe(el);
  };
}