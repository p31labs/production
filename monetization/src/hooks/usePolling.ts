import { useEffect, useRef, useState } from 'react';

export function usePolling<T>(fetcher: () => Promise<T>, intervalMs = 30000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<number | null>(null);
  const currentInterval = useRef(intervalMs);

  const fetch = async () => {
    try {
      const result = await fetcher();
      setData(result);
      setError(null);
      currentInterval.current = intervalMs;
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
      currentInterval.current = Math.min(currentInterval.current * 1.5, 300000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
    timerRef.current = setTimeout(() => {
      fetch();
    }, currentInterval.current);

    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  const refetch = () => {
    setLoading(true);
    fetch();
  };

  return { data, error, loading, refetch, lastUpdated };
}
