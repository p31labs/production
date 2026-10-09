/**
 * Identity — the P31 post-quantum identity surface.
 *
 * Generate a sovereign identity (ML-DSA-65 via @noble/post-quantum, the same
 * primitive apps/phos uses), view the DID, sign a document manifest, verify
 * a signature. No server. Keys live in IndexedDB.
 */
import { useEffect, useState } from 'react';
import { generateIdentity, loadIdentity, sign, verify, type P31Identity } from '../lib/pqc-browser';

export default function Identity() {
  const [identity, setIdentity] = useState<P31Identity | null>(null);
  const [busy, setBusy] = useState(false);
  const [sigOutput, setSigOutput] = useState<string | null>(null);
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<boolean | null>(null);

  useEffect(() => { loadIdentity().then(setIdentity); }, []);

  async function handleGenerate() {
    setBusy(true);
    try { setIdentity(await generateIdentity()); }
    finally { setBusy(false); }
  }

  async function handleSign() {
    setBusy(true);
    try { setSigOutput(await sign('p31-forge-document-manifest')); }
    finally { setBusy(false); }
  }

  async function handleVerify() {
    if (!identity || !sigOutput) return;
    setVerifyResult(await verify(identity.sigPublicKey, 'p31-forge-document-manifest', verifyInput.trim() || sigOutput));
  }

  return (
    <section className="route route--identity">
      <header className="page-header">
        <p className="eyebrow">Forge · Identity</p>
        <h1>P31 Identity</h1>
        <p className="lede">
          A sovereign post-quantum identity — ML-DSA-65 (FIPS 204). No server. Your keys, your DID.
        </p>
      </header>

      {!identity ? (
        <div className="panel glass glass--coherent">
          <h2>No identity yet</h2>
          <p>Generate a post-quantum identity. The keypair lives in your browser's IndexedDB.</p>
          <button className="btn btn--primary" onClick={handleGenerate} disabled={busy}>
            {busy ? 'Generating…' : 'Generate identity'}
          </button>
        </div>
      ) : (
        <>
          <div className="panel glass">
            <h2>Your DID</h2>
            <code className="did">{identity.did}</code>
            <dl className="kv">
              <dt>Algorithm</dt><dd>ML-DSA-65 (FIPS 204)</dd>
              <dt>Created</dt><dd>{new Date(identity.createdAt).toLocaleString()}</dd>
            </dl>
          </div>

          <div className="panel glass">
            <h2>Sign &amp; verify</h2>
            <button className="btn btn--primary" onClick={handleSign} disabled={busy}>
              {busy ? 'Signing…' : 'Sign document manifest'}
            </button>
            {sigOutput && (
              <>
                <label className="pane-label">Signature (base64)</label>
                <textarea readOnly value={sigOutput} className="sig-textarea" />
                <label className="pane-label">Verify</label>
                <input className="input" value={verifyInput} onChange={(e) => setVerifyInput(e.target.value)} placeholder="paste a signature to verify" />
                <button className="btn btn--ghost" onClick={handleVerify}>Verify</button>
                {verifyResult !== null && (
                  <p className={`verify-result ${verifyResult ? 'ok' : 'danger'}`}>
                    {verifyResult ? '✅ VALID' : '❌ INVALID'}
                  </p>
                )}
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}