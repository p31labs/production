import { useState, useEffect } from 'react';

interface DunaStats {
  members: number;
  active: number;
  target: number;
  loading: boolean;
  error: string | null;
}

export function useDunaStats(initialTarget = 100): DunaStats {
  const [stats, setStats] = useState<Omit<DunaStats, 'loading' | 'error'>>({ members: 1, active: 0, target: initialTarget });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch('/api/duna/stats')
      .then((res) => {
        if (!res.ok) throw new Error('DUNA stats unavailable');
        return res.json();
      })
      .then((data) => {
        if (mounted) {
          setStats({
            members: data.members ?? 1,
            active: data.active ?? 0,
            target: data.target ?? initialTarget,
          });
          setError(null);
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [initialTarget]);

  return { ...stats, loading, error };
}
