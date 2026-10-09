import { useEffect, useState } from 'react';
import { MetricCard } from '../components/MetricCard';
import { StatusBanner } from '../components/StatusBanner';
import { formatCurrency } from '../lib/formatters';

interface UsageData {
  range_days: number;
  total_calls: number;
  total_cost_usdc: string;
  avg_latency_ms: number;
  by_endpoint: { endpoint: string; calls: number }[];
  by_day: { day: number; calls: number }[];
}

export default function UsageSurface() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState(30);

  const fetchUsage = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/usage?range=${range}`);
      if (!res.ok) throw new Error('Usage fetch failed');
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load usage');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  return (
    <div className="surface-page">
      <header className="surface-head">
        <div>
          <h2 className="surface-title">Usage</h2>
          <p className="surface-sub">API usage, estimated cost, and latency.</p>
        </div>
      </header>

      <div className="controls-row">
        <div className="seg" role="group" aria-label="Range">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              type="button"
              className={`seg-btn ${range === days ? 'is-active' : ''}`}
              onClick={() => setRange(days)}
            >
              {days}d
            </button>
          ))}
        </div>
        <button className="btn btn-glass" type="button" onClick={fetchUsage} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && <StatusBanner kind="error">{error}</StatusBanner>}

      <div className="metric-grid">
        <MetricCard label="API Calls" value={loading ? '—' : data?.total_calls ?? 0} sub={`Last ${range} days`} />
        <MetricCard label="Estimated Cost" value={loading ? '—' : `$${formatCurrency(data?.total_cost_usdc ?? '0')}`} sub="Usage-based value" accent="gold" />
        <MetricCard label="Avg Latency" value={loading ? '—' : `${data?.avg_latency_ms ?? 0}ms`} sub="Across endpoints" accent="green" />
      </div>

      {loading ? (
        <div className="empty-state"><h3>Loading…</h3></div>
      ) : !data?.by_endpoint?.length ? (
        <div className="empty-state"><h3>No API calls recorded yet</h3></div>
      ) : (
        <>
          <h3 className="surface-card-title" style={{ marginBottom: 'var(--p31-space-3)' }}>Top Endpoints</h3>
          <div className="row-list">
            {data.by_endpoint.map((e) => (
              <div key={e.endpoint} className="row-card">
                <div className="row-card__head">
                  <span className="row-card__title mono">/api/{e.endpoint}</span>
                  <span className="row-card__value">{e.calls} calls</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}