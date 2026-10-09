import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { MetricCard } from '../components/MetricCard';
import { StatusBanner } from '../components/StatusBanner';
import { StatusBadge, type MetricStatus } from '../components/StatusBadge';
import { useNotifStore } from '../lib/useNotifStore';
import { btcpayInvoicesQuery, queryKeys } from '../lib/api/queries';
import { formatCurrency, formatRelativeTime } from '../lib/formatters';

const STATUS_COLOR: Record<string, MetricStatus> = {
  New: 'loading',
  Processing: 'stale',
  Settled: 'live',
  Expired: 'empty',
  Invalid: 'error',
};

export default function InvoicesSurface() {
  const q = useQuery(btcpayInvoicesQuery);
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ amount: '0.0001', currency: 'BTC', orderId: '' });
  const notify = useNotifStore((s) => s.notify);

  const invoices = q.data?.invoices ?? [];
  const settled = invoices.filter((i) => i.status === 'Settled');

  const createInvoice = async () => {
    setCreating(true);
    setError('');
    try {
      await api.createInvoice(form.amount, form.currency, form.orderId || undefined);
      setForm({ amount: '0.0001', currency: 'BTC', orderId: '' });
      notify({ kind: 'success', title: 'Invoice created', body: `${form.currency} ${form.amount}` });
      void queryClient.invalidateQueries({ queryKey: queryKeys.btcpay.invoices() });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invoice creation failed');
      notify({ kind: 'error', title: 'Invoice creation failed' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="surface-page">
      <header className="surface-head">
        <div>
          <h2 className="surface-title">Invoices</h2>
          <p className="surface-sub">BTCPay Server — create, track, and settle.</p>
        </div>
      </header>

      <div className="metric-grid">
        <MetricCard
          label="Total"
          value={invoices.length}
          sub="all invoices"
          accent="cyan"
          status={q.isPending ? 'loading' : 'live'}
          lastUpdated={q.dataUpdatedAt ? new Date(q.dataUpdatedAt) : null}
        />
        <MetricCard
          label="Settled"
          value={settled.length}
          sub="paid + confirmed"
          accent="green"
          status={q.isPending ? 'loading' : 'live'}
          lastUpdated={q.dataUpdatedAt ? new Date(q.dataUpdatedAt) : null}
        />
      </div>

      {error && <StatusBanner kind="error">{error}</StatusBanner>}
      {q.isError && <StatusBanner kind="error">Failed to load invoices from BTCPay Server.</StatusBanner>}

      <div className="surface-card" style={{ marginBottom: 'var(--p31-space-6)' }}>
        <h3 className="surface-card-title" style={{ marginBottom: 'var(--p31-space-4)' }}>Create Invoice</h3>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="inv-amount">Amount</label>
            <input id="inv-amount" type="text" inputMode="decimal" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
          </div>
          <div className="field">
            <label htmlFor="inv-currency">Currency</label>
            <select id="inv-currency" value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}>
              <option value="BTC">BTC</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="inv-order">Order ID (optional)</label>
            <input id="inv-order" type="text" value={form.orderId} onChange={(e) => setForm((p) => ({ ...p, orderId: e.target.value }))} />
          </div>
        </div>
        <button className="btn btn-primary" type="button" onClick={createInvoice} disabled={creating}>
          {creating ? 'Creating…' : 'Create Invoice'}
        </button>
      </div>

      {q.isPending ? (
        <div className="empty-state"><h3>Loading invoices…</h3></div>
      ) : invoices.length === 0 ? (
        <div className="empty-state"><h3>No invoices yet</h3><p>Create one above to get a BTCPay checkout link.</p></div>
      ) : (
        <div className="row-list">
          {invoices.map((inv) => (
            <div key={inv.id} className="row-card">
              <div className="row-card__head">
                <span className="row-card__title">{inv.currency} {formatCurrency(inv.amount ?? 0)}</span>
                <StatusBadge status={STATUS_COLOR[inv.status] ?? 'empty'} />
              </div>
              <div className="row-card__meta">
                {inv.checkoutLink ? (
                  <a href={inv.checkoutLink} target="_blank" rel="noopener noreferrer">Open checkout ↗</a>
                ) : (
                  inv.id
                )}
                {inv.orderId ? ` · ${inv.orderId}` : ''}
              </div>
              {inv.createdTime != null && (
                <div className="row-card__meta">{formatRelativeTime(inv.createdTime)}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}