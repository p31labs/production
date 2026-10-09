import { useEffect } from 'react';

/** Re-run a refetch when the WebMCP `refreshSection` tool fires `p31:refresh`. */
export function useRefreshEvent(refetch: () => void) {
  useEffect(() => {
    const onRefresh = () => refetch();
    window.addEventListener('p31:refresh', onRefresh);
    return () => window.removeEventListener('p31:refresh', onRefresh);
  }, [refetch]);
}