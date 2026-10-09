import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MetricCard } from '../components/MetricCard';
import { StatusBanner } from '../components/StatusBanner';
import { useLiveSurface } from '../hooks/useLiveSurface';
import { queryStatus } from '../components/WidgetTile';
import { opportunitiesQuery, queryKeys } from '../lib/api/queries';
import { formatCurrency, formatTime } from '../lib/formatters';

const CHAINS = ['ethereum', 'base', 'solana'];

export default function OpportunitiesSurface() {
  const [selectedChain, setSelectedChain] = useState<string | undefined>(undefined);
  const q = useQuery(opportunitiesQuery(selectedChain));
  const queryClient = useQueryClient();
  useLiveSurface('opportunities', queryKeys.opportunities.list(selectedChain));

  const opportunities = q.data?.opportunities ?? [];
  const st = queryStatus(q);

  const scan = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.list(selectedChain) });
  };

  return (
    <div className="surface-page">
      <header className="surface-head">
        <div>
          <h2 className="surface-title">Opportunities</h2>
          <p className="surface-sub">MEV arbitrage and allocator signals, Maker tier.</p>
        </div>
      </header>

      {q.isError && <StatusBanner kind="error">Failed to load opportunities.</StatusBanner>}

      <div className="controls-row">
        <div className="seg" role="group" aria-label="Chain filter">
          <button
            type="button"
            className={`seg-btn ${selectedChain === undefined ? 'is-active' : ''}`}
            onClick={() => setSelectedChain(undefined)}
          >
            All
          </button>
          {CHAINS.map((chain) => (
            <button
              key={chain}
              type="button"
              className={`seg-btn ${selectedChain === chain ? 'is-active' : ''}`}
              onClick={() => setSelectedChain(chain)}
            >
              {chain}
            </button>
          ))}
        </div>
        <button className="btn btn-glass" type="button" onClick={scan} disabled={q.isFetching}>
          {q.isFetching ? 'Scanning…' : 'Scan Now'}
        </button>
      </div>

      <div className="metric-grid">
        <MetricCard
          label="Opportunities Found"
          value={opportunities.length}
          sub={selectedChain ? `On ${selectedChain}` : 'All chains'}
          accent="gold"
          status={st.status}
          lastUpdated={q.dataUpdatedAt ? new Date(q.dataUpdatedAt) : null}
        />
      </div>

      {q.isPending ? (
        <div className="empty-state"><h3>Scanning for opportunities…</h3></div>
      ) : opportunities.length === 0 ? (
        <div className="empty-state"><h3>No opportunities found</h3></div>
      ) : (
        <div className="row-list">
          {opportunities.map((o) => (
            <div key={o.id} className="row-card">
              <div className="row-card__head">
                <span className="row-card__title">{o.chain}</span>
                <span className="row-card__value">{formatCurrency(o.profit_bps, 0)} bps</span>
              </div>
              <div className="row-card__meta">{o.dex_path?.join(' → ')}</div>
              <div className="row-card__meta">
                Net: {formatCurrency(o.net_profit)} · Gas: {formatCurrency(o.gas_estimate)} · {formatTime(o.timestamp)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}