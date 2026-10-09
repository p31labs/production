import { useEffect, useRef } from 'react';
import { useQueryClient, type QueryClient, type FetchQueryOptions } from '@tanstack/react-query';
import { ROUTE_LOADERS, PRIMARY_QUERY, FLAGSHIP_IDS } from '../lib/prefetchMap';
import type { SectionId } from '../lib/nav';

/** Eagerly load a surface's route chunk and primary query (cache-warm). */
export function prefetchSection(qc: QueryClient, id: SectionId): void {
  void ROUTE_LOADERS[id]?.();
  const q = (PRIMARY_QUERY as Partial<Record<SectionId, FetchQueryOptions>>)[id];
  if (q) void qc.prefetchQuery(q);
}

/**
 * Behavioral prefetch (Base App pattern): prefetch the flagship surfaces after
 * first idle so mobile-tab switches are instant — chunk already downloaded,
 * primary query already resolved. Costs ~nothing after first paint.
 */
export function usePrefetchFlagshipsOnIdle(ids: SectionId[] = FLAGSHIP_IDS): void {
  const qc = useQueryClient();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      for (const id of ids) prefetchSection(qc, id);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [qc, ids]);
}

/** One-shot prefetch when the bound element is hovered or focused (desktop nav). */
export function usePrefetchOnHover(id: SectionId) {
  const qc = useQueryClient();
  const fired = useRef(false);
  return {
    onMouseEnter: () => {
      if (!fired.current) {
        fired.current = true;
        prefetchSection(qc, id);
      }
    },
    onFocus: () => {
      if (!fired.current) {
        fired.current = true;
        prefetchSection(qc, id);
      }
    },
  };
}