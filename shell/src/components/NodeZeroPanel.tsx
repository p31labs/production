import { useState, useEffect } from 'react';
import { useShellStore } from '../store/useShellStore';
import { useAppStore } from '../store/useAppStore';
import { getOrCreateDidKey, getEd25519PubKeyB64 } from '../lib/identity';
import { pairSession, sendTelemetry } from '../lib/nodeZero';
import { useFocusTrap } from '../hooks/useFocusTrap';

export default function NodeZeroPanel() {
  const open = useShellStore((s) => s.nodeZeroOpen);
  const setOpen = useShellStore((s) => s.setNodeZeroOpen);
  const showToast = useAppStore((s) => s.showToast);

  const [did, setDid] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'idle' | 'challenging' | 'pending-confirm' | 'paired' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { panelRef } = useFocusTrap(open, () => setOpen(false));

  useEffect(() => {
    if (!open) {
      pairSession.reset();
      setStep('idle');
      setMsg('');
      setCode('');
      return;
    }
    getOrCreateDidKey().then((d) => {
      setDid(d);
      pairSession.did = d;
    }).catch(() => showToast('DID key fetch failed', 'error'));
  }, [open]);

  const handlePair = async () => {
    setLoading(true);
    setMsg('Searching for Node Zero…');
    const chal = await pairSession.startPairing();
    if (!chal) {
      setStep('error');
      setMsg(pairSession.errorMessage);
      setLoading(false);
      return;
    }
    setStep('challenging');
    setMsg(`Enter the 6-digit code shown on your Node Zero device. (Hint: ${chal.code})`);
    setLoading(false);
  };

  const handleConfirm = async () => {
    if (!code || code.length < 4) { setMsg('Enter the pairing code'); return; }
    setLoading(true);
    setStep('pending-confirm');
    setMsg('Verifying…');
    const pub = await getEd25519PubKeyB64();
    const ok = await pairSession.submitCode(parseInt(code), pub ?? '');
    if (ok) {
      setStep('paired');
      setMsg('Node Zero paired successfully');
    } else {
      setStep('error');
      setMsg(pairSession.errorMessage);
    }
    setLoading(false);
  };

  const handleSimulate = async () => {
    setLoading(true);
    setMsg('Running challenge-response simulation…');
    const ok = await pairSession.simulatePairing();
    if (ok) {
      setStep('paired');
      setMsg('Simulated pairing succeeded');
    } else {
      setStep('error');
      setMsg(pairSession.errorMessage);
    }
    setLoading(false);
  };

  const handleTelemetry = async () => {
    setLoading(true);
    const ok = await sendTelemetry(did, pairSession.deviceId ?? '');
    setMsg(ok ? 'Telemetry sent' : 'Failed to send telemetry');
    setLoading(false);
  };

  const handleRetry = () => {
    pairSession.reset();
    setStep('idle');
    setMsg('');
    setCode('');
  };

  const isVerifyEnv = import.meta.env.MODE !== 'production' || (typeof window !== 'undefined' && (window as any).__P31_VERIFY__);

  if (!open) return null;

  return (
    <div className="akinator-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }} role="dialog" aria-modal="true" aria-labelledby="node-zero-panel-title">
      <div className="akinator-panel" ref={panelRef}>
        <div className="akinator-header">
          <span className="akinator-avatar">🖥️</span>
          <h3 className="akinator-title" id="node-zero-panel-title">Node Zero</h3>
          <button type="button" className="akinator-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
        </div>
        <div className="akinator-body" style={{ gap: 'var(--p31-space-tiny)' }}>

          {step === 'idle' && (
            <>
              <p className="akinator-candidates-hint">Node Zero is your sovereign ESP32-S3 hardware companion. Pair it with your shell to sync spoon states, submit care proofs, and stream encrypted telemetry.</p>
              <button type="button" className="btn primary" onClick={handlePair} disabled={loading}>
                {loading ? 'Searching for Node Zero…' : 'Pair with Node Zero'}
              </button>
              {isVerifyEnv && (
                <button type="button" className="btn ghost" onClick={handleSimulate} disabled={loading} style={{ marginTop: 8 }}>
                  Simulate Pairing
                </button>
              )}
            </>
          )}

          {(step === 'challenging' || step === 'pending-confirm') && (
            <div className="akinator-question-card">
              <div className="akinator-question-label">Enter pairing code</div>
              <p className="akinator-candidates-hint">{msg}</p>
              <input
                type="text"
                className="akinator-search-input"
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                style={{ marginTop: 8 }}
              />
              <div className="akinator-buttons" style={{ marginTop: 12 }}>
                <button type="button" className="btn ghost" onClick={handleRetry} disabled={loading}>Cancel</button>
                <button type="button" className="btn primary" onClick={handleConfirm} disabled={loading}>
                  {loading ? 'Verifying…' : 'Confirm'}
                </button>
              </div>
            </div>
          )}

          {step === 'paired' && (
            <div className="akinator-question-card">
              <div className="akinator-question-label">Paired ✓</div>
              <p className="akinator-question-text">Node Zero paired · {pairSession.deviceId ?? 'paired'}</p>
              <p className="akinator-candidates-hint">Your DID: {did.slice(0, 30)}…</p>
              <div className="akinator-buttons" style={{ marginTop: 12 }}>
                <button type="button" className="btn ghost" onClick={handleTelemetry} disabled={loading}>Send Telemetry</button>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="akinator-question-card">
              <div className="akinator-question-label">Error ✗</div>
              <p className="akinator-candidates-hint">{msg || pairSession.errorMessage}</p>
              <div className="akinator-buttons" style={{ marginTop: 12 }}>
                <button type="button" className="btn primary" onClick={handleRetry}>Try again</button>
              </div>
            </div>
          )}

          {msg && step !== 'challenging' && step !== 'pending-confirm' && step !== 'error' && (
            <p className="akinator-candidates-hint">{msg}</p>
          )}
        </div>
      </div>
    </div>
  );
}
