import { useEffect, useState } from 'react';
import { DEFAULT_HASH, hashToPath, routeForPath, type QpjRoute } from '../lib/routes';

export function useHashRoute(): { route: QpjRoute; path: string } {
  const [hash, setHash] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.hash || DEFAULT_HASH : DEFAULT_HASH
  );

  useEffect(() => {
    const onHashChange = () => {
      setHash(window.location.hash || DEFAULT_HASH);
    };
    if (!window.location.hash) {
      window.history.replaceState(null, '', `${window.location.pathname}${DEFAULT_HASH}`);
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const path = hashToPath(hash);
  return { route: routeForPath(path), path };
}