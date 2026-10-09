import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { LiveSurface } from '../lib/api/queries';

/**
 * Subscribes to the worker's SSE stream for one surface and writes each delta
 * into the TanStack Query cache. On disconnect, EventSource auto-reconnects;
 * the surface's own refetchInterval covers the gap (SSE is an accelerator,
 * never the only data path).
 */
export function useLiveSurface(surface: LiveSurface, queryKey: readonly unknown[]): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    const es = new EventSource(`/api/stream?surfaces=${surface}`);

    const onMessage = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as unknown;
        queryClient.setQueryData(queryKey as unknown[], data);
      } catch {
        // ignore malformed frames — fall back to polling
      }
    };

    es.addEventListener(surface, onMessage);
    es.addEventListener('error', () => {
      // EventSource retries automatically; polling covers the gap.
    });

    return () => {
      es.removeEventListener(surface, onMessage);
      es.close();
    };
  }, [surface, queryKey, queryClient]);
}