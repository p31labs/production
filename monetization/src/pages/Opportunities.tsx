import { useState } from 'react';
import { usePolling } from '../hooks/usePolling';
import { api } from '../api/client';
import GlassCard from '../components/GlassCard';
import { formatCurrency, formatTime } from '../lib/formatters';

const CHAINS = ['ethereum', 'base', 'solana'];

export default function Opportunities() {
  const [selectedChain, setSelectedChain] = useState<string | undefined>(undefined);
  const { data: oppsData, loading, error, refetch } = usePolling(
    () => api.getOpportunities(selectedChain),
    30000
  );
  const opportunities = oppsData?.opportunities ?? [];

  if (error) {
    return (
      <div className="page-error">
        <p>Failed to load opportunities.</p>
        <button className="btn btn-secondary" onClick={refetch}>Retry</button>
      </div>
    );
  }

  return (
    <div className="page-opportunities">
      <div className="opportunity-controls">
        <div className="chain-filter">
          <label className="filter-label">Chain:</label>
          <select
            className="chain-select"
            value={selectedChain ?? ''}
            onChange={(e) => setSelectedChain(e.target.value || undefined)}
          >
            <option value="">All chains</option>
            {CHAINS.map((chain) => (
              <option key={chain} value={chain}>{chain}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" onClick={refetch} disabled={loading}>
          {loading ? 'Scanning…' : 'Scan Now'}
        </button>
      </div>

      <div className="opportunities-stats">
        <GlassCard title="Opportunities Found" variant="gold">
          <div className="metric-value accent-gold">{opportunities.length}</div>
          <div className="metric-sub">{selectedChain ? `On ${selectedChain}` : 'All chains'}</div>
          <div className="metric-graph" />
        </GlassCard>
      </div>

      {loading && opportunities.length === 0 ? (
        <div className="loading-state">Scanning for opportunities…</div>
      ) : opportunities.length === 0 ? (
        <div className="empty-state">No opportunities found.</div>
      ) : (
        <div className="opportunities-list">
          {opportunities.map((opp) => (
            <div key={opp.id} className="opportunity-row">
              <div className="opportunity-header">
                <span className="opportunity-chain">{opp.chain}</span>
                <span className="opportunity-profit accent-gold">+{formatCurrency(opp.net_profit)} USDC</span>
              </div>
              <div className="opportunity-path">{opp.dex_path.join(' → ')}</div>
              <div className="opportunity-meta">
                <span>{opp.profit_bps / 100}% profit</span>
                <span>Gas: {formatCurrency(opp.gas_estimate)} USDC</span>
                <span>{formatTime(opp.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
