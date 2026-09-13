import { useState } from 'react';
import { api } from '../api/client';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import { formatCurrency, formatRelativeTime } from '../lib/formatters';

export default function Invoices() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ amount: '0.0001', currency: 'BTC', orderId: '' });

  const createInvoice = async () => {
    setCreating(true);
    setError('');
    try {
      const invoice = await api.createInvoice(form.amount, form.currency, form.orderId || undefined);
      setInvoices((prev) => [invoice, ...prev]);
      setForm({ amount: '0.0001', currency: 'BTC', orderId: '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invoice creation failed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page-invoices">
      <GlassCard title="Create Invoice" variant="cyan">
        <div className="config-fields">
          <div className="config-field-row">
            <div className="config-field">
              <label className="config-field-label">Amount</label>
              <input
                className="setting-input"
                type="text"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              />
            </div>
            <div className="config-field">
              <label className="config-field-label">Currency</label>
              <select
                className="setting-select"
                value={form.currency}
                onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
              >
                <option value="BTC">BTC</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div className="config-field">
              <label className="config-field-label">Order ID (optional)</label>
              <input
                className="setting-input"
                type="text"
                value={form.orderId}
                onChange={(e) => setForm((p) => ({ ...p, orderId: e.target.value }))}
              />
            </div>
            <button className="btn btn-primary" onClick={createInvoice} disabled={creating}>
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </GlassCard>

      {error && <div className="page-error">{error}</div>}

      <div className="positions-list-section" style={{ marginTop: 24 }}>
        <h3 className="section-title">Recent Invoices</h3>
        {invoices.length === 0 ? (
          <EmptyState
            icon="📄"
            title="No invoices yet"
            description="Create your first BTCPay invoice to start accepting Bitcoin payments."
            steps={[
              '☐ Enter amount and currency above',
              '☐ Click Create to generate a BTCPay invoice',
              '☐ Share the checkout link with the payer',
            ]}
          />
        ) : (
          <div className="positions-list">
            {invoices.map((inv) => (
              <div key={inv.id} className="position-row">
                <div className="position-info">
                  <span className="position-protocol">{inv.id}</span>
                  <span className="position-chain">{inv.currency} · {inv.status}</span>
                </div>
                <div className="position-metrics">
                  <span className="position-amount">{formatCurrency(inv.amount)} {inv.currency}</span>
                </div>
                <span className="position-time">{formatRelativeTime(inv.createdTime)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
