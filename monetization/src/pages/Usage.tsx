import { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { formatCurrency } from '../lib/formatters';

interface UsageData {
  range_days: number;
  total_calls: number;
  total_cost_usdc: string;
  avg_latency_ms: number;
  by_endpoint: { endpoint: string; calls: number }[];
  by_day: { day: number; calls: number }[];
}

export default function Usage() {
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
    fetchUsage();
  }, [range]);

  return (
    <div className="page-usage">
      <div className="usage-range-controls">
        <button className={`btn btn-secondary ${range === 7 ? 'active' : ''}`} onClick={() => setRange(7)}>7d</button>
        <button className={`btn btn-secondary ${range === 30 ? 'active' : ''}`} onClick={() => setRange(30)}>30d</button>
        <button className={`btn btn-secondary ${range === 90 ? 'active' : ''}`} onClick={() => setRange(90)}>90d</button>
      </div>

      {error && <div className="page-error">{error}</div>}

      <div className="usage-summary-grid">
        <GlassCard title="API Calls" variant="cyan">
          <div className="metric-value accent-cyan">{loading ? '—' : (data?.total_calls ?? 0)}</div>
          <div className="metric-sub">Last {range} days</div>
        </GlassCard>
        <GlassCard title="Estimated Cost" variant="gold">
          <div className="metric-value accent-gold">{loading ? '—' : `$${formatCurrency(data?.total_cost_usdc ?? '0')}`}</div>
          <div className="metric-sub">Usage-based value</div>
        </GlassCard>
        <GlassCard title="Avg Latency" variant="green">
          <div className="metric-value accent-green">{loading ? '—' : `${data?.avg_latency_ms ?? 0}ms`}</div>
          <div className="metric-sub">Across endpoints</div>
        </GlassCard>
      </div>

      <GlassCard title="Top Endpoints" className="usage-section">
        {loading ? (
          <div className="loading-state">Loading…</div>
        ) : !data || data.by_endpoint.length === 0 ? (
          <div className="empty-state-text">No API calls recorded yet.</div>
        ) : (
          <div className="usage-endpoints">
            {data.by_endpoint.map((e) => (
              <div key={e.endpoint} className="usage-endpoint-row">
                <span className="usage-endpoint-path">/api/{e.endpoint}</span>
                <span className="usage-endpoint-calls">{e.calls} calls</span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <div className="page-actions">
        <button className="btn btn-primary" onClick={fetchUsage} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}
