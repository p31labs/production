import { useState, useEffect } from 'react';
import { useShellStore } from '../store/useShellStore';
import { getOrCreateDidKey, signWithDid } from '../lib/identity';
import { signMldsa65 } from '../lib/pqc';
import { useFocusTrap } from '../hooks/useFocusTrap';

export default function SBTPanel() {
  const open = useShellStore((s) => s.sbtOpen);
  const setOpen = useShellStore((s) => s.setSbtOpen);
  const [did, setDid] = useState('');
  const [sbtData, setSbtData] = useState<unknown>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { panelRef } = useFocusTrap(open, () => setOpen(false));

  useEffect(() => { if (open) getOrCreateDidKey().then(setDid).catch(() => {}); }, [open]);

  const handleMint = async () => {
    setLoading(true);
    try {
      const sig = await signWithDid(`mint|${did}|${Date.now()}`);
      const res = await fetch('https://ledger-bridge.trimtab-signal.workers.dev/sbt/mint', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ did, signature: sig, users: [did], tasks: ['shell-attestation'], entropyRoots: ['0x' + '0'.repeat(64)] }),
      });
      const data = await res.json().catch(() => ({}));
      setSbtData(data);
      setMsg(data?.ok ? 'SBT minted!' : 'Mint failed');
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : 'failed'}`);
    }
    setLoading(false);
  };

  const handleMintPrivate = async () => {
    setLoading(true);
    try {
      const mldsa = await signMldsa65(`private-mint|${did}`);
      const res = await fetch('https://ledger-bridge.trimtab-signal.workers.dev/sbt/mint-private', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          did,
          claims: { type: 'care-attestation', date: new Date().toISOString() },
          hideCareScore: true,
          hideTrustTier: false,
          hideTokenId: false,
          secretHex: 'ab'.repeat(32),
          ...(mldsa?.sigB64 ? { mldsa65_sig: mldsa.sigB64 } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      setSbtData(data);
      setMsg(data?.ok ? 'Private SBT minted' : 'Private mint failed');
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : 'failed'}`);
    }
    setLoading(false);
  };

  const handleView = async () => {
    setLoading(true);
    try {
      const res = await fetch(`https://ledger-bridge.trimtab-signal.workers.dev/sbt/mint`, {
        method: 'GET',
        headers: { 'content-type': 'application/json' },
      }).catch(() => null);
      if (res?.ok) {
        const data = await res.json().catch(() => ({}));
        setSbtData(data);
        setMsg('');
      } else {
        setMsg('Could not fetch SBT data — use on-chain explorers');
      }
    } catch { setMsg('Fetch failed'); }
    setLoading(false);
  };

  if (!open) return null;

  return (
    <div className="akinator-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }} role="dialog" aria-modal="true" aria-labelledby="sbt-panel-title">
      <div className="akinator-panel" ref={panelRef}>
        <div className="akinator-header">
          <span className="akinator-avatar">💎</span>
          <h3 className="akinator-title" id="sbt-panel-title">LOVE SBTs</h3>
          <button type="button" className="akinator-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
        </div>
        <div className="akinator-body" style={{ gap: 'var(--p31-space-tiny)' }}>
          <div className="akinator-question-card">
            <div className="akinator-question-label">Your DID</div>
            <p className="akinator-question-text" style={{ fontFamily: 'monospace', fontSize: 'var(--p31-scale-xs)', wordBreak: 'break-all' }}>{did || 'Loading…'}</p>
          </div>
          <div className="akinator-question-card">
            <div className="akinator-question-label">Mint</div>
            <div className="akinator-buttons" style={{ marginTop: 8 }}>
              <button type="button" className="btn primary" onClick={handleMint} disabled={loading}>Mint SBT (Public)</button>
              <button type="button" className="btn ghost" onClick={handleMintPrivate} disabled={loading}>Mint Private (SD‑JWT + Merkle)</button>
            </div>
          </div>
          <div className="akinator-question-card">
            <div className="akinator-question-label">On-Chain</div>
            <p className="akinator-candidates-hint" style={{ marginTop: 4 }}>
              <a href="https://sepolia.basescan.org/address/0x521cAD1b54CDDB2B6B53a30EBe050C429F9c6C55" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--p31-accent)' }}>LOVESBT</a>
              {' · '}
              <a href="https://sepolia.basescan.org/address/0x08263FdD50196F229C9C2ccD650056067b884538" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--p31-accent)' }}>ProofOfCare</a>
            </p>
            <button type="button" className="btn ghost" onClick={handleView} disabled={loading} style={{ marginTop: 8 }}>View SBTs</button>
          </div>
          {msg && <p className="akinator-candidates-hint">{msg}</p>}
          {sbtData != null && <pre style={{ fontFamily: 'monospace', fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-secondary)', overflow: 'auto', maxHeight: 120 }}>{JSON.stringify(sbtData, null, 2)}</pre>}
        </div>
      </div>
    </div>
  );
}
