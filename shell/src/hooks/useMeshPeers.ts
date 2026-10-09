import { useState, useEffect } from 'react';

export function useMeshPeers(): number {
  const [peers, setPeers] = useState<number>(() => (window as any).__p31_meshSync?.peers ?? 0);

  useEffect(() => {
    const sync = () => setPeers((window as any).__p31_meshSync?.peers ?? 0);
    sync();
    const iv = window.setInterval(sync, 5000);
    return () => window.clearInterval(iv);
  }, []);

  return peers;
}
