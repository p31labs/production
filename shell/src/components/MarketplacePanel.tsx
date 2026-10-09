import { useState } from 'react';
import { useShellStore } from '../store/useShellStore';
import { callMCPTool } from '../lib/mcpRegistry';
import { useFocusTrap } from '../hooks/useFocusTrap';

export default function MarketplacePanel() {
  const open = useShellStore((s) => s.marketOpen);
  const setOpen = useShellStore((s) => s.setMarketOpen);
  const [result, setResult] = useState<unknown>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { panelRef } = useFocusTrap(open, () => setOpen(false));

  const call = async (tool: string, args: Record<string, unknown> = {}) => {
    setLoading(true);
    try { const r = await callMCPTool('marketplace', tool, args); setResult(r); setMsg(''); } catch (e) { setMsg(`❌ ${e instanceof Error ? e.message : 'failed'}`); }
    setLoading(false);
  };

  if (!open) return null;

  return (
    <div className="akinator-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }} role="dialog" aria-modal="true" aria-labelledby="marketplace-panel-title">
      <div className="akinator-panel" ref={panelRef}>
        <div className="akinator-header">
          <span className="akinator-avatar">🏪</span>
          <h3 className="akinator-title" id="marketplace-panel-title">P31 Marketplace</h3>
          <button type="button" className="akinator-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
        </div>
        <div className="akinator-body" style={{ gap: 'var(--p31-space-tiny)' }}>
          <div className="akinator-buttons">
            <button type="button" className="btn ghost" onClick={() => call('marketplace_list')} disabled={loading}>List</button>
            <button type="button" className="btn ghost" onClick={() => call('marketplace_history')} disabled={loading}>History</button>
          </div>
          <div className="akinator-buttons">
            <button type="button" className="btn ghost" onClick={() => call('marketplace_offer', { itemId: 'demo', price: '10', currency: 'LOVE' })} disabled={loading}>Offer</button>
            <button type="button" className="btn ghost" onClick={() => call('marketplace_accept', { offerId: 'demo-1' })} disabled={loading}>Accept</button>
            <button type="button" className="btn ghost" onClick={() => call('marketplace_reject', { offerId: 'demo-1' })} disabled={loading}>Reject</button>
          </div>
          <div className="akinator-buttons">
            <button type="button" className="btn ghost" onClick={() => call('marketplace_escrow_status', { dealId: 'demo' })} disabled={loading}>Escrow</button>
            <button type="button" className="btn ghost" onClick={() => call('marketplace_dispute', { dealId: 'demo', evidenceHash: '0x' + 'b'.repeat(64) })} disabled={loading}>Dispute</button>
          </div>
          {msg && <p className="akinator-candidates-hint">{msg}</p>}
          {result != null && <pre style={{ fontFamily: 'monospace', fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-secondary)', overflow: 'auto', maxHeight: 120 }}>{JSON.stringify(result, null, 2)}</pre>}
        </div>
      </div>
    </div>
  );
}
