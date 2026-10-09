import { useState } from 'react';
import { useShellStore } from '../store/useShellStore';
import { callMCPTool } from '../lib/mcpRegistry';
import { useFocusTrap } from '../hooks/useFocusTrap';

export default function JusticePanel() {
  const open = useShellStore((s) => s.justiceOpen);
  const setOpen = useShellStore((s) => s.setJusticeOpen);
  const [result, setResult] = useState<unknown>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { panelRef } = useFocusTrap(open, () => setOpen(false));

  const call = async (tool: string, args: Record<string, unknown> = {}) => {
    setLoading(true);
    try {
      const r = await callMCPTool('justice', tool, args);
      setResult(r);
      setMsg('');
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : 'failed'}`);
    }
    setLoading(false);
  };

  if (!open) return null;

  return (
    <div className="akinator-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }} role="dialog" aria-modal="true" aria-labelledby="justice-panel-title">
      <div className="akinator-panel" ref={panelRef}>
        <div className="akinator-header">
          <span className="akinator-avatar">⚖️</span>
          <h3 className="akinator-title" id="justice-panel-title">Sovereign Justice</h3>
          <button type="button" className="akinator-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
        </div>
        <div className="akinator-body" style={{ gap: 'var(--p31-space-tiny)' }}>
          <div className="akinator-question-card">
            <div className="akinator-question-label">Evidence</div>
            <div className="akinator-buttons" style={{ marginTop: 8 }}>
              <button type="button" className="btn ghost" onClick={() => call('justice_evidence_deposit', { caseId: 'shell-demo', uploaderDid: 'did:p31:demo', payloadHash: '0x' + 'a'.repeat(64) })} disabled={loading}>Deposit</button>
              <button type="button" className="btn ghost" onClick={() => call('justice_evidence_verify', { entryId: 'demo-1' })} disabled={loading}>Verify</button>
            </div>
          </div>
          <div className="akinator-question-card">
            <div className="akinator-question-label">Cases</div>
            <div className="akinator-buttons" style={{ marginTop: 8 }}>
              <button type="button" className="btn ghost" onClick={() => call('justice_case_create', { title: 'Shell demo case', partyADid: 'did:p31:a', partyBDid: 'did:p31:b' })} disabled={loading}>Create Case</button>
              <button type="button" className="btn ghost" onClick={() => call('justice_case_list', {})} disabled={loading}>List Cases</button>
            </div>
          </div>
          <div className="akinator-question-card">
            <div className="akinator-question-label">Escrow</div>
            <div className="akinator-buttons" style={{ marginTop: 8 }}>
              <button type="button" className="btn ghost" onClick={() => call('justice_escrow_deposit', { escrowId: 'demo', payerDid: 'did:p31:a', payeeDid: 'did:p31:b', arbiterDid: 'did:p31:c', amount: '100', condition: 'deliverable' })} disabled={loading}>Deposit</button>
              <button type="button" className="btn ghost" onClick={() => call('justice_escrow_release', { escrowId: 'demo', signerDid: 'did:p31:a' })} disabled={loading}>Release</button>
            </div>
          </div>
          <div className="akinator-question-card">
            <div className="akinator-question-label">Online Dispute Resolution</div>
            <div className="akinator-buttons" style={{ marginTop: 8 }}>
              <button type="button" className="btn ghost" onClick={() => call('justice_odr_offer', { caseId: 'demo', partyDid: 'did:p31:a', amount: '50', round: 1 })} disabled={loading}>Offer</button>
              <button type="button" className="btn ghost" onClick={() => call('justice_odr_resolve', { caseId: 'demo', acceptedByDid: 'did:p31:b' })} disabled={loading}>Resolve</button>
            </div>
          </div>
          {msg && <p className="akinator-candidates-hint">{msg}</p>}
          {result != null && <pre style={{ fontFamily: 'monospace', fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-secondary)', overflow: 'auto', maxHeight: 120 }}>{JSON.stringify(result, null, 2)}</pre>}
        </div>
      </div>
    </div>
  );
}
