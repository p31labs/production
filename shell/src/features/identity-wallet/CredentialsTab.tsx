import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useIdentityWallet } from './useIdentityWallet';
import GlassCard from '../../components/ui/GlassCard';
import { issueSdJwt, verifySdJwt, submitCareProof, registerPqcOnChain } from '../../lib/pqc';
import { getOrCreateDidKey } from '../../lib/identity';

export interface CredentialsTabHeaderControlsProps {
  issuing: boolean;
  registering: boolean;
  pqcReady: boolean;
  onIssueTestCredential: () => void;
  onRegisterPqc: () => void;
}

export function CredentialsTabHeaderControls({
  issuing,
  registering,
  pqcReady,
  onIssueTestCredential,
  onRegisterPqc,
}: CredentialsTabHeaderControlsProps) {
  return (
    <>
      <button type="button" className="btn primary" style={{ fontSize: 'var(--p31-scale-xs)' }} onClick={onIssueTestCredential} disabled={issuing}>
        {issuing ? 'Issuing…' : 'Issue Test Credential'}
      </button>
      <button type="button" className="btn ghost" style={{ fontSize: 'var(--p31-scale-xs)' }} onClick={onRegisterPqc} disabled={registering || !pqcReady}>
        {registering ? 'Registering…' : pqcReady ? 'Register PQC on chain' : 'PQC not ready'}
      </button>
    </>
  );
}

export interface CredentialsTabProps {
  issuing?: boolean;
  registering?: boolean;
  pqcReady?: boolean;
  onIssueTestCredential?: () => void;
  onRegisterPqc?: () => void;
}

export default function CredentialsTab({
  issuing = false,
  registering = false,
  pqcReady: pqcReadyProp,
  onIssueTestCredential,
  onRegisterPqc,
}: CredentialsTabProps) {
  const profile = useAppStore((s) => s.profile);
  const showToast = useAppStore((s) => s.showToast);
  const { did, careScore, credentialCount, pqcReady: hookPqcReady, refresh } = useIdentityWallet();
  const pqcReady = pqcReadyProp ?? hookPqcReady;

  const [careProofLoading, setCareProofLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const sbts = profile?.sbts ?? [];

  const handleIssueTestCredential = async () => {
    setMsg('');
    try {
      const res = await issueSdJwt({
        type: 'vault-attestation',
        careScore,
        timestamp: new Date().toISOString(),
      });
      if (!res) throw new Error('issueSdJwt returned null');
      const verifyRes = await verifySdJwt(res.sdjwt);
      if (verifyRes?.valid) {
        setMsg(`✓ SD-JWT issued + verified — care score ${careScore.toFixed(2)} disclosed`);
        showToast?.('Credential issued and verified', 'success');
        refresh();
      } else {
        setMsg('⚠ Credential issued but verification failed');
      }
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : 'issue failed'}`);
    }
  };

  const handleSubmitCareProof = async () => {
    setCareProofLoading(true);
    setMsg('');
    try {
      const res = await submitCareProof([did], ['attunement']);
      if (res?.ok) {
        setMsg('✓ Care proof submitted — PQC co-signed');
        showToast?.('Care proof submitted', 'success');
      } else {
        setMsg('⚠ Care proof submission returned no confirmation');
      }
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : 'care proof failed'}`);
    }
    setCareProofLoading(false);
  };

  const handleRegisterPqc = async () => {
    setMsg('');
    try {
      const ok = await registerPqcOnChain();
      setMsg(ok ? '✓ ML-DSA-65 public key registered on chain' : '⚠ Registration returned no confirmation');
      if (ok) showToast?.('PQC key registered on chain', 'success');
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : 'registration failed'}`);
    }
  };

  return (
    <div className="page-fill p31-ambient-bg">
      <div className="profile-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridAutoRows: 154,
        gap: 'var(--p31-space-xs)',
        flex: '1 1 auto',
        minHeight: 0,
      }}>
        <GlassCard title="Soulbound Tokens" variant="willow" className="dashboard-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {sbts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflow: 'auto' }}>
                {sbts.slice(-4).map((sbt, i) => (
                  <div key={i} style={{ padding: 4, borderRadius: 'var(--p31-radius-sm)', border: '1px solid var(--p31-glass-border)', background: 'var(--p31-glass-bg)', fontSize: 'var(--p31-scale-xs)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--p31-text)' }}>{sbt.type || 'Credential'}</div>
                    <div style={{ color: 'var(--p31-text-tertiary)', wordBreak: 'break-all' }}>ID: {sbt.id?.slice(0, 20)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)' }}>No credentials issued yet.</span>
            )}
            <div className="card-meta-row" style={{ marginTop: 'auto' }}>
              <span>{credentialCount} issued</span>
              <span style={{ color: 'var(--p31-accent-green)' }}>SBT · ERC-5192</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard title="SD-JWT" variant="phos" className="dashboard-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 0 }}>
            <Field label="Profile" value="RFC 9901" />
            <Field label="Signing" value="Ed25519" />
            <Field label="Disclosures" value="selective" />
            <div className="card-meta-row" style={{ marginTop: 'auto' }}>
              <span>dc+sd-jwt</span>
              <span style={{ color: 'var(--p31-accent)' }}>SHA-256</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard title="Care Proof" variant="bash" className="dashboard-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 0 }}>
            <Field label="Status" value={pqcReady ? 'ML-DSA-65 ready' : 'No PQC key'} />
            <Field label="Co-signature" value={pqcReady ? 'available' : 'pending'} />
            <div className="card-meta-row" style={{ marginTop: 'auto' }}>
              <span>attunement</span>
              <button type="button" className="btn primary" style={{ fontSize: 'var(--p31-scale-xs)', padding: '4px 10px' }} onClick={handleSubmitCareProof} disabled={careProofLoading || !pqcReady}>
                {careProofLoading ? 'Submitting…' : 'Submit proof'}
              </button>
            </div>
          </div>
        </GlassCard>
      </div>

      {msg && (
        <div style={{ marginTop: 'var(--p31-space-xs)', fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-secondary)' }}>{msg}</div>
      )}

      <div style={{ marginTop: 'var(--p31-space-xs)', fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)' }}>
        Presenting/verifying against the wallet MCP service is deferred to the wallet MCP service phase — it requires a wallet session (<code>wallet_create</code>) and <code>sessionId</code> management, which the shell does not yet have. Issuance and local verification are live now.
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 'var(--p31-scale-xs)' }}>
      <span style={{ color: 'var(--p31-text-secondary)' }}>{label}</span>
      <span style={{ color: 'var(--p31-text)', fontWeight: 600 }}>{value}</span>
    </div>
  );
}
